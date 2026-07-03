import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()

const EMAIL = 'profile.user@example.com'
const ORIGINAL = 'Password123!'
const NEXT = 'NewPassw0rd!'

async function login(email: string, password: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email, password }).expect(200)
  return agent
}

describe('account settings', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } })
    await prisma.user.create({
      data: {
        email: EMAIL,
        name: 'Original Name',
        passwordHash: await hashPassword(ORIGINAL),
        status: UserStatus.ACTIVE,
      },
    })
  })

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email: EMAIL } } })
    await prisma.user.deleteMany({ where: { email: EMAIL } })
  })

  it('updates the caller’s own display name', async () => {
    const agent = await login(EMAIL, ORIGINAL)
    const res = await agent.patch('/api/v1/auth/profile').send({ name: 'Renamed User' }).expect(200)
    expect(res.body.name).toBe('Renamed User')

    const me = await agent.get('/api/v1/auth/me').expect(200)
    expect(me.body.name).toBe('Renamed User')
  })

  it('rejects a profile update with an empty name', async () => {
    const agent = await login(EMAIL, ORIGINAL)
    await agent.patch('/api/v1/auth/profile').send({ name: '   ' }).expect(400)
  })

  it('rejects a password change when the current password is wrong', async () => {
    const agent = await login(EMAIL, ORIGINAL)
    const res = await agent
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'wrong-password', newPassword: NEXT })
      .expect(400)
    expect(res.body.error.message).toMatch(/current password/i)
  })

  it('rejects reusing the current password', async () => {
    const agent = await login(EMAIL, ORIGINAL)
    await agent
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: ORIGINAL, newPassword: ORIGINAL })
      .expect(400)
  })

  it('changes the password, then the old one fails and the new one works', async () => {
    const agent = await login(EMAIL, ORIGINAL)
    await agent
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: ORIGINAL, newPassword: NEXT })
      .expect(204)

    // Old password no longer authenticates; new one does.
    await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: ORIGINAL }).expect(401)
    await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: NEXT }).expect(200)
  })
})
