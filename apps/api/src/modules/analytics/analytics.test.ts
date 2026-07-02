import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()

const READER_EMAIL = 'analytics.reader@example.com'
const ROLE_NAME = 'Analytics Reader Role'

async function loginAs(email: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email, password: 'Password123!' }).expect(200)
  return agent
}

describe('analytics', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: READER_EMAIL } })
    await prisma.role.deleteMany({ where: { name: ROLE_NAME } })
    await prisma.permission.createMany({ data: [{ key: 'billing:read' }], skipDuplicates: true })

    const role = await prisma.role.create({
      data: {
        name: ROLE_NAME,
        permissions: { create: [{ permission: { connect: { key: 'billing:read' } } }] },
      },
    })
    await prisma.user.create({
      data: {
        email: READER_EMAIL,
        name: 'Analytics Reader',
        passwordHash: await hashPassword('Password123!'),
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: role.id }] },
      },
    })
  })

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email: READER_EMAIL } } })
    await prisma.user.deleteMany({ where: { email: READER_EMAIL } })
    await prisma.role.deleteMany({ where: { name: ROLE_NAME } })
  })

  it('returns a dashboard summary with real aggregates', async () => {
    const reader = await loginAs(READER_EMAIL)
    const res = await reader.get('/api/v1/analytics/summary').expect(200)

    expect(typeof res.body.kpis.totalMrrCents).toBe('number')
    expect(typeof res.body.kpis.activeCustomers).toBe('number')
    expect(Array.isArray(res.body.customersByStatus)).toBe(true)
    expect(Array.isArray(res.body.subscriptionsByPlan)).toBe(true)
    expect(Array.isArray(res.body.invoicesByStatus)).toBe(true)
    // Revenue trend is a gap-free 12-month series.
    expect(res.body.revenueTrend).toHaveLength(12)
    expect(res.body.revenueTrend[0]).toMatchObject({ month: expect.any(String), totalCents: expect.any(Number) })
  })

  it('requires authentication', async () => {
    await request(app).get('/api/v1/analytics/summary').expect(401)
  })
})
