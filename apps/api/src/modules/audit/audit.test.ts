import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()

const READER_EMAIL = 'audit.reader@example.com'
const NOACCESS_EMAIL = 'audit.noaccess@example.com'
const testEmails = [READER_EMAIL, NOACCESS_EMAIL]
const READER_ROLE = 'Audit Reader Role'
const NOACCESS_ROLE = 'Audit NoAccess Role'
const testRoleNames = [READER_ROLE, NOACCESS_ROLE]
const SPEC_ENTITY = 'audit-spec-entity'

let readerId = ''

async function loginAs(email: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email, password: 'Password123!' }).expect(200)
  return agent
}

async function seedFixtures(): Promise<void> {
  await prisma.auditLog.deleteMany({ where: { entity: SPEC_ENTITY } })
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
  await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
  await prisma.permission.createMany({
    data: [{ key: 'audit:read' }, { key: 'billing:read' }],
    skipDuplicates: true,
  })

  const readerRole = await prisma.role.create({
    data: { name: READER_ROLE, permissions: { create: [{ permission: { connect: { key: 'audit:read' } } }] } },
  })
  const noAccessRole = await prisma.role.create({
    data: { name: NOACCESS_ROLE, permissions: { create: [{ permission: { connect: { key: 'billing:read' } } }] } },
  })

  const passwordHash = await hashPassword('Password123!')
  const reader = await prisma.user.create({
    data: {
      email: READER_EMAIL,
      name: 'Audit Reader',
      passwordHash,
      status: UserStatus.ACTIVE,
      roles: { create: [{ roleId: readerRole.id }] },
    },
  })
  readerId = reader.id
  await prisma.user.create({
    data: {
      email: NOACCESS_EMAIL,
      name: 'No Access',
      passwordHash,
      status: UserStatus.ACTIVE,
      roles: { create: [{ roleId: noAccessRole.id }] },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: reader.id,
      action: 'spec.create',
      entity: SPEC_ENTITY,
      entityId: 'entity-1',
      before: undefined,
      after: { name: 'after' },
    },
  })
}

describe('audit', () => {
  beforeAll(async () => {
    await seedFixtures()
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entity: SPEC_ENTITY } })
    await prisma.session.deleteMany({ where: { user: { email: { in: testEmails } } } })
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
    await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
  })

  it('lists audit logs with the actor resolved and filters by entity', async () => {
    const reader = await loginAs(READER_EMAIL)
    const res = await reader.get('/api/v1/audit').query({ entity: SPEC_ENTITY }).expect(200)

    expect(res.body.total).toBeGreaterThanOrEqual(1)
    const row = res.body.data.find((r: { action: string }) => r.action === 'spec.create')
    expect(row).toBeTruthy()
    expect(row.actorId).toBe(readerId)
    expect(row.actorEmail).toBe(READER_EMAIL)
    expect(row.after).toMatchObject({ name: 'after' })
  })

  it('denies a user without audit:read with 403', async () => {
    const noAccess = await loginAs(NOACCESS_EMAIL)
    const res = await noAccess.get('/api/v1/audit').expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('requires authentication', async () => {
    await request(app).get('/api/v1/audit').expect(401)
  })
})
