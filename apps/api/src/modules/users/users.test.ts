import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()

const SUPER_EMAIL = 'users.super@example.com'
const WRITER_EMAIL = 'users.writer@example.com'
const READER_EMAIL = 'users.reader@example.com'
const LAST_ADMIN_EMAIL = 'users.lastadmin@example.com'
const testEmails = [SUPER_EMAIL, WRITER_EMAIL, READER_EMAIL, LAST_ADMIN_EMAIL]

const SUPER_ROLE = 'Users Super Role'
const WRITER_ROLE = 'Users Writer Role'
const READER_ROLE = 'Users Reader Role'
const BASIC_ROLE = 'Users Basic Role'
const ELEVATED_ROLE = 'Users Elevated Role'
const testRoleNames = [SUPER_ROLE, WRITER_ROLE, READER_ROLE, BASIC_ROLE, ELEVATED_ROLE]

// These already exist from the seed — upsert (never delete) so we don't strip them
// from the seeded Admin/Manager/Viewer roles via cascade.
const testPermissionKeys = ['users:read', 'users:write', 'users:delete', 'billing:read']

// API-created users land under this domain so list/cleanup only touch this suite's rows.
const USER_DOMAIN = '@user-spec.test'

let basicRoleId = ''
let elevatedRoleId = ''

async function loginAs(email: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app)
  await agent.post('/api/v1/auth/login').send({ email, password: 'Password123!' }).expect(200)
  return agent
}

function roleWith(name: string, keys: string[], description: string) {
  return prisma.role.create({
    data: {
      name,
      description,
      permissions: { create: keys.map((key) => ({ permission: { connect: { key } } })) },
    },
  })
}

async function seedFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
  await prisma.user.deleteMany({ where: { email: { endsWith: USER_DOMAIN } } })
  await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
  await prisma.permission.createMany({ data: testPermissionKeys.map((key) => ({ key })), skipDuplicates: true })

  const superRole = await roleWith(SUPER_ROLE, ['users:read', 'users:write', 'users:delete', 'billing:read'], 'User admin')
  const writerRole = await roleWith(WRITER_ROLE, ['users:read', 'users:write', 'billing:read'], 'User editor, no delete')
  const readerRole = await roleWith(READER_ROLE, ['users:read'], 'Read-only')
  const basicRole = await roleWith(BASIC_ROLE, ['billing:read'], 'Low-privilege assignable role')
  const elevatedRole = await roleWith(ELEVATED_ROLE, ['users:delete'], 'Needs users:delete to assign')
  basicRoleId = basicRole.id
  elevatedRoleId = elevatedRole.id

  const passwordHash = await hashPassword('Password123!')
  const make = (email: string, name: string, roleId: string) =>
    prisma.user.create({
      data: { email, name, passwordHash, status: UserStatus.ACTIVE, roles: { create: [{ roleId }] } },
    })

  await make(SUPER_EMAIL, 'Super', superRole.id)
  await make(WRITER_EMAIL, 'Writer', writerRole.id)
  await make(READER_EMAIL, 'Reader', readerRole.id)
}

describe('users', () => {
  beforeAll(async () => {
    await seedFixtures()
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entity: 'user' } })
    await prisma.session.deleteMany({ where: { user: { email: { in: testEmails } } } })
    await prisma.user.deleteMany({ where: { email: { endsWith: USER_DOMAIN } } })
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
    await prisma.role.deleteMany({ where: { name: { in: testRoleNames } } })
    // Permissions are shared with the seed — intentionally not deleted.
  })

  it('runs a full create → read → update → delete flow and audits each mutation', async () => {
    const admin = await loginAs(SUPER_EMAIL)

    const created = await admin
      .post('/api/v1/users')
      .send({ email: `new${USER_DOMAIN}`, name: 'New User', password: 'Password123!', roleIds: [basicRoleId] })
      .expect(201)
    expect(created.body).toMatchObject({ email: `new${USER_DOMAIN}`, name: 'New User', status: 'ACTIVE' })
    expect(created.body.roles).toEqual([{ id: basicRoleId, name: BASIC_ROLE }])
    expect(created.body.passwordHash).toBeUndefined()
    const id: string = created.body.id

    await admin.get(`/api/v1/users/${id}`).expect(200)

    const updated = await admin
      .patch(`/api/v1/users/${id}`)
      .send({ name: 'Renamed', status: 'SUSPENDED' })
      .expect(200)
    expect(updated.body).toMatchObject({ name: 'Renamed', status: 'SUSPENDED' })

    await admin.delete(`/api/v1/users/${id}`).expect(204)
    await admin.get(`/api/v1/users/${id}`).expect(404)

    const audited = await prisma.auditLog.findMany({ where: { entity: 'user', entityId: id } })
    expect(audited.map((row) => row.action).sort()).toEqual(['user.create', 'user.delete', 'user.update'])
  })

  it('lists roles for the assignment picker', async () => {
    const admin = await loginAs(SUPER_EMAIL)
    const res = await admin.get('/api/v1/roles').expect(200)
    const basic = res.body.data.find((r: { name: string }) => r.name === BASIC_ROLE)
    expect(basic).toBeTruthy()
    expect(basic.permissions).toEqual(['billing:read'])
  })

  it('paginates and filters the list server-side', async () => {
    const admin = await loginAs(SUPER_EMAIL)
    await admin
      .post('/api/v1/users')
      .send({ email: `active${USER_DOMAIN}`, password: 'Password123!', roleIds: [basicRoleId] })
      .expect(201)
    const suspended = await admin
      .post('/api/v1/users')
      .send({ email: `susp${USER_DOMAIN}`, password: 'Password123!', roleIds: [basicRoleId] })
      .expect(201)
    await admin.patch(`/api/v1/users/${suspended.body.id}`).send({ status: 'SUSPENDED' }).expect(200)

    const res = await admin.get('/api/v1/users').query({ page: 1, pageSize: 1, status: 'SUSPENDED' }).expect(200)
    expect(res.body).toMatchObject({ page: 1, pageSize: 1 })
    expect(res.body.data.every((u: { status: string }) => u.status === 'SUSPENDED')).toBe(true)
  })

  it('denies a reader (users:read only) from creating with 403', async () => {
    const reader = await loginAs(READER_EMAIL)
    await reader.get('/api/v1/users').expect(200)
    const res = await reader
      .post('/api/v1/users')
      .send({ email: `nope${USER_DOMAIN}`, password: 'Password123!', roleIds: [basicRoleId] })
      .expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects an invalid payload with 400', async () => {
    const admin = await loginAs(SUPER_EMAIL)
    const res = await admin
      .post('/api/v1/users')
      .send({ email: 'not-an-email', password: 'weak', roleIds: [] })
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a duplicate email with 409', async () => {
    const admin = await loginAs(SUPER_EMAIL)
    const res = await admin
      .post('/api/v1/users')
      .send({ email: WRITER_EMAIL, password: 'Password123!', roleIds: [basicRoleId] })
      .expect(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('blocks assigning a role that grants permissions the actor lacks (no escalation)', async () => {
    const writer = await loginAs(WRITER_EMAIL)
    // Writer has users:write but NOT users:delete, so cannot grant the elevated role.
    const res = await writer
      .post('/api/v1/users')
      .send({ email: `escalate${USER_DOMAIN}`, password: 'Password123!', roleIds: [elevatedRoleId] })
      .expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('stops an admin from suspending their own account', async () => {
    const admin = await loginAs(SUPER_EMAIL)
    const me = await admin.get('/api/v1/auth/me').expect(200)
    const res = await admin.patch(`/api/v1/users/${me.body.id}`).send({ status: 'SUSPENDED' }).expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('protects the last active Admin from deletion or suspension', async () => {
    const admin = await loginAs(SUPER_EMAIL)
    const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } })
    if (!adminRole) return // seed not present in this environment

    const passwordHash = await hashPassword('Password123!')
    const tempAdmin = await prisma.user.create({
      data: {
        email: LAST_ADMIN_EMAIL,
        name: 'Last Admin',
        passwordHash,
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: adminRole.id }] },
      },
    })

    // Make tempAdmin the sole active Admin for the duration of the assertions.
    const others = await prisma.user.findMany({
      where: { status: 'ACTIVE', id: { not: tempAdmin.id }, roles: { some: { role: { name: 'Admin' } } } },
      select: { id: true },
    })
    const otherIds = others.map((o) => o.id)

    try {
      if (otherIds.length > 0) {
        await prisma.user.updateMany({ where: { id: { in: otherIds } }, data: { status: 'SUSPENDED' } })
      }

      const del = await admin.delete(`/api/v1/users/${tempAdmin.id}`).expect(403)
      expect(del.body.error.code).toBe('FORBIDDEN')

      const suspend = await admin.patch(`/api/v1/users/${tempAdmin.id}`).send({ status: 'SUSPENDED' }).expect(403)
      expect(suspend.body.error.code).toBe('FORBIDDEN')
    } finally {
      if (otherIds.length > 0) {
        await prisma.user.updateMany({ where: { id: { in: otherIds } }, data: { status: 'ACTIVE' } })
      }
      await prisma.session.deleteMany({ where: { userId: tempAdmin.id } })
      await prisma.user.delete({ where: { id: tempAdmin.id } })
    }
  })

  it('requires authentication', async () => {
    await request(app).get('/api/v1/users').expect(401)
  })
})
