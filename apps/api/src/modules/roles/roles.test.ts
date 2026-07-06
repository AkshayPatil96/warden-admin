import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { UserStatus } from '../../generated/prisma/client.js'

const app = buildApp()

const ROLE_ADMIN_EMAIL = 'roles.admin@example.com'
const ROLE_WRITER_EMAIL = 'roles.writer@example.com'
const ROLE_READER_EMAIL = 'roles.reader@example.com'
const testEmails = [ROLE_ADMIN_EMAIL, ROLE_WRITER_EMAIL, ROLE_READER_EMAIL]

const ADMIN_ACTOR_ROLE = 'Roles Admin Actor Role'
const WRITER_ACTOR_ROLE = 'Roles Writer Actor Role'
const READER_ACTOR_ROLE = 'Roles Reader Actor Role'
const actorRoleNames = [ADMIN_ACTOR_ROLE, WRITER_ACTOR_ROLE, READER_ACTOR_ROLE]

// Roles created as test *subjects* (the things being CRUD'd), separate from the
// actor roles above (which grant the acting user permission to do the CRUD).
const SUBJECT_ROLE_PREFIX = 'Roles Subject '

// These already exist from the seed — upsert (never delete) so we don't strip them
// from the seeded Admin/Manager/Viewer roles via cascade.
const testPermissionKeys = ['users:read', 'roles:write', 'roles:delete', 'billing:read', 'settings:read']

let billingReadId = ''
let settingsReadId = ''

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
  await prisma.role.deleteMany({ where: { name: { in: actorRoleNames } } })
  await prisma.role.deleteMany({ where: { name: { startsWith: SUBJECT_ROLE_PREFIX } } })
  await prisma.permission.createMany({ data: testPermissionKeys.map((key) => ({ key })), skipDuplicates: true })

  const billingRead = await prisma.permission.findUniqueOrThrow({ where: { key: 'billing:read' } })
  const settingsRead = await prisma.permission.findUniqueOrThrow({ where: { key: 'settings:read' } })
  billingReadId = billingRead.id
  settingsReadId = settingsRead.id

  const adminActor = await roleWith(ADMIN_ACTOR_ROLE, ['users:read', 'roles:write', 'roles:delete', 'billing:read'], 'Full role admin')
  const writerActor = await roleWith(WRITER_ACTOR_ROLE, ['users:read', 'roles:write', 'billing:read'], 'Can write roles, not delete')
  const readerActor = await roleWith(READER_ACTOR_ROLE, ['users:read'], 'No role-management rights')

  const passwordHash = await hashPassword('Password123!')
  const make = (email: string, name: string, roleId: string) =>
    prisma.user.create({
      data: { email, name, passwordHash, status: UserStatus.ACTIVE, roles: { create: [{ roleId }] } },
    })

  await make(ROLE_ADMIN_EMAIL, 'Role Admin', adminActor.id)
  await make(ROLE_WRITER_EMAIL, 'Role Writer', writerActor.id)
  await make(ROLE_READER_EMAIL, 'Role Reader', readerActor.id)
}

describe('roles', () => {
  beforeAll(async () => {
    await seedFixtures()
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entity: 'role' } })
    await prisma.session.deleteMany({ where: { user: { email: { in: testEmails } } } })
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
    await prisma.role.deleteMany({ where: { name: { in: actorRoleNames } } })
    await prisma.role.deleteMany({ where: { name: { startsWith: SUBJECT_ROLE_PREFIX } } })
    // Permissions are shared with the seed — intentionally not deleted.
  })

  it('runs a full create -> read -> update -> delete flow and audits each mutation', async () => {
    const admin = await loginAs(ROLE_ADMIN_EMAIL)
    const name = `${SUBJECT_ROLE_PREFIX}CRUD`

    const created = await admin
      .post('/api/v1/roles')
      .send({ name, description: 'A test role', permissionIds: [billingReadId] })
      .expect(201)
    expect(created.body).toMatchObject({ name, description: 'A test role', permissions: ['billing:read'] })
    const id: string = created.body.id

    const listed = await admin.get('/api/v1/roles').expect(200)
    expect(listed.body.data.find((r: { id: string }) => r.id === id)).toBeTruthy()

    const updated = await admin
      .patch(`/api/v1/roles/${id}`)
      .send({ description: 'Updated description' })
      .expect(200)
    expect(updated.body.description).toBe('Updated description')

    await admin.delete(`/api/v1/roles/${id}`).expect(204)

    const audited = await prisma.auditLog.findMany({ where: { entity: 'role', entityId: id } })
    expect(audited.map((row) => row.action).sort()).toEqual(['role.create', 'role.delete', 'role.update'])
  })

  it('lists the permission catalog for the picker', async () => {
    const admin = await loginAs(ROLE_ADMIN_EMAIL)
    const res = await admin.get('/api/v1/roles/permissions').expect(200)
    expect(res.body.data.some((p: { key: string }) => p.key === 'billing:read')).toBe(true)
  })

  it('denies a reader (no roles:write) from creating a role or listing permissions', async () => {
    const reader = await loginAs(ROLE_READER_EMAIL)
    const createRes = await reader
      .post('/api/v1/roles')
      .send({ name: `${SUBJECT_ROLE_PREFIX}Denied`, permissionIds: [billingReadId] })
      .expect(403)
    expect(createRes.body.error.code).toBe('FORBIDDEN')

    const permsRes = await reader.get('/api/v1/roles/permissions').expect(403)
    expect(permsRes.body.error.code).toBe('FORBIDDEN')
  })

  it('denies a writer (no roles:delete) from deleting a role', async () => {
    const admin = await loginAs(ROLE_ADMIN_EMAIL)
    const writer = await loginAs(ROLE_WRITER_EMAIL)

    const created = await admin
      .post('/api/v1/roles')
      .send({ name: `${SUBJECT_ROLE_PREFIX}DeleteGuard`, permissionIds: [billingReadId] })
      .expect(201)

    const res = await writer.delete(`/api/v1/roles/${created.body.id}`).expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')

    await admin.delete(`/api/v1/roles/${created.body.id}`).expect(204)
  })

  it('rejects an invalid payload with 400', async () => {
    const admin = await loginAs(ROLE_ADMIN_EMAIL)
    const res = await admin.post('/api/v1/roles').send({ name: '', permissionIds: [] }).expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a duplicate role name with 409', async () => {
    const admin = await loginAs(ROLE_ADMIN_EMAIL)
    const name = `${SUBJECT_ROLE_PREFIX}Dup`
    await admin.post('/api/v1/roles').send({ name, permissionIds: [billingReadId] }).expect(201)
    const res = await admin.post('/api/v1/roles').send({ name, permissionIds: [billingReadId] }).expect(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('blocks bundling a permission the actor does not hold (no escalation)', async () => {
    const writer = await loginAs(ROLE_WRITER_EMAIL)
    // Writer holds roles:write but NOT settings:read, so cannot create a role granting it.
    const res = await writer
      .post('/api/v1/roles')
      .send({ name: `${SUBJECT_ROLE_PREFIX}Escalate`, permissionIds: [settingsReadId] })
      .expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('blocks deleting a role that is still assigned to a user', async () => {
    const admin = await loginAs(ROLE_ADMIN_EMAIL)
    const created = await admin
      .post('/api/v1/roles')
      .send({ name: `${SUBJECT_ROLE_PREFIX}Assigned`, permissionIds: [billingReadId] })
      .expect(201)
    const roleId: string = created.body.id

    const passwordHash = await hashPassword('Password123!')
    const holder = await prisma.user.create({
      data: {
        email: `assigned${Date.now()}@user-spec.test`,
        passwordHash,
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId }] },
      },
    })

    try {
      const res = await admin.delete(`/api/v1/roles/${roleId}`).expect(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    } finally {
      await prisma.session.deleteMany({ where: { userId: holder.id } })
      await prisma.user.delete({ where: { id: holder.id } })
      await admin.delete(`/api/v1/roles/${roleId}`).expect(204)
    }
  })

  it('protects the Admin role from renaming, permission lockout, and deletion', async () => {
    const admin = await loginAs(ROLE_ADMIN_EMAIL)
    const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } })
    if (!adminRole) return // seed not present in this environment

    const rename = await admin
      .patch(`/api/v1/roles/${adminRole.id}`)
      .send({ name: 'Not Admin' })
      .expect(403)
    expect(rename.body.error.code).toBe('FORBIDDEN')

    const lockout = await admin
      .patch(`/api/v1/roles/${adminRole.id}`)
      .send({ permissionIds: [billingReadId] })
      .expect(403)
    expect(lockout.body.error.code).toBe('FORBIDDEN')

    const del = await admin.delete(`/api/v1/roles/${adminRole.id}`).expect(403)
    expect(del.body.error.code).toBe('FORBIDDEN')
  })

  it('requires authentication', async () => {
    await request(app).get('/api/v1/roles/permissions').expect(401)
  })
})
