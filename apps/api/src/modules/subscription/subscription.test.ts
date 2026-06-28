import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()

const WRITER_EMAIL = 'subscription.writer@example.com'
const READER_EMAIL = 'subscription.reader@example.com'
const testEmails = [WRITER_EMAIL, READER_EMAIL]
const testRoleNames = ['Subscription Writer Role', 'Subscription Reader Role']
const testPermissionKeys = ['billing:read', 'billing:write', 'billing:delete']
const CUSTOMER_EMAIL = 'owner@subscription-spec.test'

let testCustomerId = ''
const futurePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

async function loginAs(email: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email, password: 'Password123!' }).expect(200)
  return agent
}

async function seedFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
  await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
  await prisma.permission.deleteMany({ where: { key: { in: testPermissionKeys } } })
  await prisma.customer.deleteMany({ where: { email: CUSTOMER_EMAIL } })

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

  const customer = await prisma.customer.create({
    data: { name: 'Sub Owner', email: CUSTOMER_EMAIL, status: 'ACTIVE', mrrCents: 0 },
  })
  testCustomerId = customer.id
}

describe('subscriptions', () => {
  beforeAll(async () => {
    await seedFixtures()
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entity: 'subscription' } })
    await prisma.subscription.deleteMany({ where: { customerId: testCustomerId } })
    await prisma.customer.deleteMany({ where: { email: CUSTOMER_EMAIL } })
    await prisma.session.deleteMany({ where: { user: { email: { in: testEmails } } } })
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
    await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
    await prisma.permission.deleteMany({ where: { key: { in: testPermissionKeys } } })
  })

  it('runs a full create → read → update → delete flow and audits each mutation', async () => {
    const writer = await loginAs(WRITER_EMAIL)

    const created = await writer
      .post('/api/v1/subscriptions')
      .send({ customerId: testCustomerId, plan: 'PRO', interval: 'MONTHLY', priceCents: 4990, currentPeriodEnd: futurePeriodEnd })
      .expect(201)
    expect(created.body).toMatchObject({
      customerId: testCustomerId,
      plan: 'PRO',
      status: 'TRIALING',
      interval: 'MONTHLY',
      priceCents: 4990,
      canceledAt: null,
    })
    const id: string = created.body.id

    await writer.get(`/api/v1/subscriptions/${id}`).expect(200)

    // Cancelling stamps canceledAt (service invariant).
    const canceled = await writer.patch(`/api/v1/subscriptions/${id}`).send({ status: 'CANCELED' }).expect(200)
    expect(canceled.body.status).toBe('CANCELED')
    expect(canceled.body.canceledAt).not.toBeNull()

    // Reactivating clears it again.
    const reactivated = await writer.patch(`/api/v1/subscriptions/${id}`).send({ status: 'ACTIVE' }).expect(200)
    expect(reactivated.body.canceledAt).toBeNull()

    await writer.delete(`/api/v1/subscriptions/${id}`).expect(204)
    await writer.get(`/api/v1/subscriptions/${id}`).expect(404)

    const audited = await prisma.auditLog.findMany({ where: { entity: 'subscription', entityId: id } })
    expect(audited.map((row) => row.action).sort()).toEqual([
      'subscription.create',
      'subscription.delete',
      'subscription.update',
      'subscription.update',
    ])
  })

  it('rejects a subscription for a non-existent customer with 404', async () => {
    const writer = await loginAs(WRITER_EMAIL)
    const res = await writer
      .post('/api/v1/subscriptions')
      .send({
        customerId: '00000000-0000-4000-8000-000000000000',
        plan: 'STARTER',
        priceCents: 0,
        currentPeriodEnd: futurePeriodEnd,
      })
      .expect(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('paginates and filters the list server-side', async () => {
    const writer = await loginAs(WRITER_EMAIL)
    await writer
      .post('/api/v1/subscriptions')
      .send({ customerId: testCustomerId, plan: 'STARTER', status: 'ACTIVE', priceCents: 900, currentPeriodEnd: futurePeriodEnd })
      .expect(201)
    await writer
      .post('/api/v1/subscriptions')
      .send({ customerId: testCustomerId, plan: 'ENTERPRISE', status: 'PAST_DUE', priceCents: 99900, currentPeriodEnd: futurePeriodEnd })
      .expect(201)

    const res = await writer
      .get('/api/v1/subscriptions')
      .query({ page: 1, pageSize: 1, status: 'PAST_DUE', customerId: testCustomerId })
      .expect(200)

    expect(res.body).toMatchObject({ page: 1, pageSize: 1 })
    expect(res.body.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].status).toBe('PAST_DUE')
  })

  it('denies a reader (billing:read only) from writing with 403', async () => {
    const reader = await loginAs(READER_EMAIL)
    await reader.get('/api/v1/subscriptions').expect(200)

    const res = await reader
      .post('/api/v1/subscriptions')
      .send({ customerId: testCustomerId, plan: 'PRO', priceCents: 100, currentPeriodEnd: futurePeriodEnd })
      .expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects an invalid payload with 400', async () => {
    const writer = await loginAs(WRITER_EMAIL)
    const res = await writer
      .post('/api/v1/subscriptions')
      .send({ customerId: testCustomerId, plan: 'NOPE', priceCents: -5, currentPeriodEnd: 'not-a-date' })
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('requires authentication', async () => {
    await request(app).get('/api/v1/subscriptions').expect(401)
  })
})
