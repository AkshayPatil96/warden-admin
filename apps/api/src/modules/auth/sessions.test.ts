import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()
const EMAIL = 'sessions.user@example.com'

async function login(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email: EMAIL, password: 'Password123!' }).expect(200)
  return agent
}

describe('active sessions', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } })
    await prisma.user.create({
      data: {
        email: EMAIL,
        name: 'Sessions User',
        passwordHash: await hashPassword('Password123!'),
        status: UserStatus.ACTIVE,
      },
    })
  })

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email: EMAIL } } })
    await prisma.user.deleteMany({ where: { email: EMAIL } })
  })

  it('lists sessions and flags the current one', async () => {
    const agent = await login()
    const res = await agent.get('/api/v1/auth/sessions').expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    const current = res.body.filter((s: { current: boolean }) => s.current)
    expect(current).toHaveLength(1)
  })

  it('cannot revoke the current session via the revoke endpoint', async () => {
    const agent = await login()
    const sessions = await agent.get('/api/v1/auth/sessions').expect(200)
    const currentId = sessions.body.find((s: { current: boolean }) => s.current).id
    await agent.post('/api/v1/auth/sessions/revoke').send({ id: currentId }).expect(400)
  })

  it('revoke-others keeps the current session and drops the rest', async () => {
    // Two independent logins => two sessions for the same user.
    const first = await login()
    await login()
    expect((await first.get('/api/v1/auth/sessions')).body.length).toBeGreaterThanOrEqual(2)

    const res = await first.post('/api/v1/auth/sessions/revoke-others').expect(200)
    expect(res.body.revoked).toBeGreaterThanOrEqual(1)

    // The caller is still authenticated and now has exactly one session.
    const after = await first.get('/api/v1/auth/sessions').expect(200)
    expect(after.body).toHaveLength(1)
    expect(after.body[0].current).toBe(true)
  })
})
