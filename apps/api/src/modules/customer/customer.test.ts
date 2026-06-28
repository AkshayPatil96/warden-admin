import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()

const WRITER_EMAIL = 'customer.writer@example.com'
const READER_EMAIL = 'customer.reader@example.com'
const testEmails = [WRITER_EMAIL, READER_EMAIL]
const testRoleNames = ['Customer Writer Role', 'Customer Reader Role']
const testPermissionKeys = ['billing:read', 'billing:write', 'billing:delete']
// Distinct domain so cleanup only ever touches this suite's rows.
const CUSTOMER_DOMAIN = '@customer-spec.test'

async function loginAs(email: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email, password: 'Password123!' }).expect(200)
  return agent
}

async function seedFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
  await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
  await prisma.permission.deleteMany({ where: { key: { in: testPermissionKeys } } })
  await prisma.customer.deleteMany({ where: { email: { endsWith: CUSTOMER_DOMAIN } } })

  for (const key of testPermissionKeys) {
    await prisma.permission.create({ data: { key } })
  }

  const writerRole = await prisma.role.create({
    data: {
      name: testRoleNames[0],
      description: 'Full billing access.',
      permissions: { create: testPermissionKeys.map((key) => ({ permission: { connect: { key } } })) },
    },
  })
  const readerRole = await prisma.role.create({
    data: {
      name: testRoleNames[1],
      description: 'Read-only billing access.',
      permissions: { create: [{ permission: { connect: { key: 'billing:read' } } }] },
    },
  })

  const passwordHash = await hashPassword('Password123!')
  await prisma.user.create({
    data: {
      email: WRITER_EMAIL,
      name: 'Billing Writer',
      passwordHash,
      status: UserStatus.ACTIVE,
      roles: { create: [{ role: { connect: { id: writerRole.id } } }] },
    },
  })
  await prisma.user.create({
    data: {
      email: READER_EMAIL,
      name: 'Billing Reader',
      passwordHash,
      status: UserStatus.ACTIVE,
      roles: { create: [{ role: { connect: { id: readerRole.id } } }] },
    },
  })
}

describe('customers', () => {
  beforeAll(async () => {
    await seedFixtures()
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entity: 'customer' } })
    await prisma.customer.deleteMany({ where: { email: { endsWith: CUSTOMER_DOMAIN } } })
    await prisma.session.deleteMany({ where: { user: { email: { in: testEmails } } } })
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
    await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
    await prisma.permission.deleteMany({ where: { key: { in: testPermissionKeys } } })
  })

  it('runs a full create → read → update → delete flow and audits each mutation', async () => {
    const writer = await loginAs(WRITER_EMAIL)

    const created = await writer
      .post('/api/v1/customers')
      .send({ name: 'Spec Customer', email: `spec1${CUSTOMER_DOMAIN}`, company: 'Spec Co', mrrCents: 5000 })
      .expect(201)
    expect(created.body).toMatchObject({
      name: 'Spec Customer',
      email: `spec1${CUSTOMER_DOMAIN}`,
      status: 'ACTIVE',
      mrrCents: 5000,
    })
    const id: string = created.body.id

    await writer.get(`/api/v1/customers/${id}`).expect(200)

    const updated = await writer
      .patch(`/api/v1/customers/${id}`)
      .send({ status: 'PAST_DUE', mrrCents: 7500 })
      .expect(200)
    expect(updated.body).toMatchObject({ status: 'PAST_DUE', mrrCents: 7500 })

    await writer.delete(`/api/v1/customers/${id}`).expect(204)
    await writer.get(`/api/v1/customers/${id}`).expect(404)

    const audited = await prisma.auditLog.findMany({ where: { entity: 'customer', entityId: id } })
    expect(audited.map((row) => row.action).sort()).toEqual([
      'customer.create',
      'customer.delete',
      'customer.update',
    ])
  })

  it('paginates and filters the list server-side', async () => {
    const writer = await loginAs(WRITER_EMAIL)
    await writer
      .post('/api/v1/customers')
      .send({ name: 'Active One', email: `active${CUSTOMER_DOMAIN}`, status: 'ACTIVE' })
      .expect(201)
    await writer
      .post('/api/v1/customers')
      .send({ name: 'Canceled One', email: `canceled${CUSTOMER_DOMAIN}`, status: 'CANCELED' })
      .expect(201)

    const res = await writer
      .get('/api/v1/customers')
      .query({ page: 1, pageSize: 1, status: 'CANCELED' })
      .expect(200)

    expect(res.body).toMatchObject({ page: 1, pageSize: 1 })
    expect(res.body.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].status).toBe('CANCELED')
  })

  it('denies a reader (billing:read only) from writing with 403', async () => {
    const reader = await loginAs(READER_EMAIL)
    await reader.get('/api/v1/customers').expect(200)

    const res = await reader
      .post('/api/v1/customers')
      .send({ name: 'Should Fail', email: `nope${CUSTOMER_DOMAIN}` })
      .expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects an invalid payload with 400', async () => {
    const writer = await loginAs(WRITER_EMAIL)
    const res = await writer
      .post('/api/v1/customers')
      .send({ name: '', email: 'not-an-email' })
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('requires authentication', async () => {
    await request(app).get('/api/v1/customers').expect(401)
  })
})
