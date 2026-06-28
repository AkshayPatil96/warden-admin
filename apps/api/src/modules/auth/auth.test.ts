import { createHash } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../lib/password.js'
import { SESSION_COOKIE } from '../../lib/session.js'
import { UserStatus } from '../../generated/prisma/client.js'
import { env } from '../../config/env.js'

const app = buildApp()
const agent = request.agent(app)

const ADMIN_EMAIL = 'auth.admin@example.com'
const LOCKOUT_EMAIL = 'auth.lockout@example.com'
const RESET_EMAIL = 'auth.reset@example.com'
const testEmails = [ADMIN_EMAIL, LOCKOUT_EMAIL, RESET_EMAIL]
const testRoleNames = ['Auth Test Admin']
const testPermissionKeys = ['users:read', 'users:write', 'audit:read']
const testAuditActions = [
  'auth.login',
  'auth.logout',
  'auth.lockout',
  'auth.password_reset',
  'auth.password_reset_requested',
]

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

async function seedAuthFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
  await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
  await prisma.permission.deleteMany({ where: { key: { in: testPermissionKeys } } })

  for (const key of testPermissionKeys) {
    await prisma.permission.create({ data: { key } })
  }

  const role = await prisma.role.create({
    data: {
      name: testRoleNames[0],
      description: 'Test role used by auth integration tests.',
      permissions: {
        create: testPermissionKeys.map((key) => ({
          permission: {
            connect: { key },
          },
        })),
      },
    },
  })

  const passwordHash = await hashPassword('Password123!')

  for (const email of testEmails) {
    await prisma.user.create({
      data: {
        email,
        name: 'Auth Test User',
        passwordHash,
        status: UserStatus.ACTIVE,
        roles: {
          create: [{ role: { connect: { id: role.id } } }],
        },
      },
    })
  }
}

describe('auth', () => {
  beforeAll(async () => {
    await seedAuthFixtures()
  })

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: {
        user: {
          email: {
            in: testEmails,
          },
        },
      },
    })

    await prisma.auditLog.deleteMany({
      where: {
        action: {
          in: testAuditActions,
        },
      },
    })

    await prisma.user.deleteMany({
      where: {
        email: {
          in: testEmails,
        },
      },
    })

    await prisma.role.deleteMany({
      where: {
        name: {
          in: testRoleNames,
        },
      },
    })

    await prisma.permission.deleteMany({
      where: {
        key: {
          in: testPermissionKeys,
        },
      },
    })
  })

  it('logs in, resolves me, and logs out end-to-end', async () => {
    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({
        email: testEmails[0],
        password: 'Password123!',
      })
      .expect(200)

    expect(loginResponse.body).toMatchObject({
      email: testEmails[0],
      name: 'Auth Test User',
      permissions: expect.arrayContaining(['users:read', 'users:write', 'audit:read']),
    })
    expect(loginResponse.headers['set-cookie']).toEqual(expect.any(Array))
    expect(String(loginResponse.headers['set-cookie'][0])).toContain(SESSION_COOKIE)

    const meResponse = await agent.get('/api/v1/auth/me').expect(200)
    expect(meResponse.body).toMatchObject({
      email: testEmails[0],
      name: 'Auth Test User',
      permissions: expect.arrayContaining(['users:read', 'users:write', 'audit:read']),
    })

    await agent.post('/api/v1/auth/logout').expect(204)

    await agent.get('/api/v1/auth/me').expect(401)
  })

  it('rejects invalid passwords', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmails[0],
        password: 'wrong-password',
      })
      .expect(401)

    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('uses remember-me ttl when rememberMe is true', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmails[0],
        password: 'Password123!',
        rememberMe: true,
      })
      .expect(200)

    const sessions = await prisma.session.findMany({
      where: {
        user: {
          email: testEmails[0],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    })

    expect(sessions).toHaveLength(1)
    const rememberedSession = sessions[0]
    const ttlHours = (rememberedSession.expiresAt.getTime() - rememberedSession.createdAt.getTime()) / (1000 * 60 * 60)

    expect(ttlHours).toBeGreaterThan(env.SESSION_TTL_HOURS)
    expect(ttlHours).toBeLessThanOrEqual(env.REMEMBER_ME_SESSION_TTL_HOURS + 0.1)
  })

  it('locks the account after too many failed logins', async () => {
    for (let attempt = 0; attempt < env.MAX_FAILED_LOGINS; attempt += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: LOCKOUT_EMAIL, password: 'wrong-password' })
        .expect(401)
    }

    // Correct credentials are now rejected while the lock is active.
    const lockedResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: LOCKOUT_EMAIL, password: 'Password123!' })
      .expect(429)
    expect(lockedResponse.body.error.code).toBe('RATE_LIMITED')

    const lockedUser = await prisma.user.findUnique({ where: { email: LOCKOUT_EMAIL } })
    expect(lockedUser?.lockedUntil).toBeInstanceOf(Date)
    expect(lockedUser?.lockedUntil?.getTime()).toBeGreaterThan(Date.now())

    const lockoutAudit = await prisma.auditLog.findFirst({
      where: { action: 'auth.lockout', entityId: lockedUser?.id },
    })
    expect(lockoutAudit).not.toBeNull()
  })

  it('forgot-password returns 204 for unknown and known emails alike', async () => {
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody-here@example.com' })
      .expect(204)

    await request(app).post('/api/v1/auth/forgot-password').send({ email: RESET_EMAIL }).expect(204)
  })

  it('resets the password with a valid token, then rejects token reuse', async () => {
    const user = await prisma.user.findUnique({ where: { email: RESET_EMAIL } })
    expect(user).not.toBeNull()
    const userId = user!.id

    // Give the reset user an active session so we can prove reset revokes it.
    await prisma.session.create({
      data: { userId, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    })

    const rawToken = 'reset-token-fixture-value'
    await prisma.passwordReset.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })

    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'NewPassword456!' })
      .expect(204)

    const updated = await prisma.user.findUnique({ where: { id: userId } })
    expect(await verifyPassword(updated!.passwordHash, 'NewPassword456!')).toBe(true)

    const remainingSessions = await prisma.session.count({ where: { userId } })
    expect(remainingSessions).toBe(0)

    // Second use of the same token is rejected.
    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'AnotherPass789!' })
      .expect(400)

    // The new password actually works for login.
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: RESET_EMAIL, password: 'NewPassword456!' })
      .expect(200)
  })

  it('rejects weak passwords on reset (validation)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'whatever', password: 'weak' })
      .expect(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})
