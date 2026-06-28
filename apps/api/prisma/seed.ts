import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, UserStatus } from '../src/generated/prisma/client.js'
import { hashPassword } from '../src/lib/password.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const permissions = [
    'users:read',
    'users:write',
    'users:delete',
    'audit:read',
    'settings:read',
    'settings:write',
  ]

  await prisma.$transaction(async (client) => {
    await client.user.deleteMany({})
    await client.role.deleteMany({})
    await client.permission.deleteMany({})
    await client.auditLog.deleteMany({})
    await client.session.deleteMany({})

    for (const key of permissions) {
      await client.permission.create({
        data: { key },
      })
    }

    const adminRole = await client.role.create({
      data: {
        name: 'Admin',
        description: 'Full access to the admin panel.',
        permissions: {
          create: permissions.map((key) => ({
            permission: {
              connect: { key },
            },
          })),
        },
      },
    })

    const managerRole = await client.role.create({
      data: {
        name: 'Manager',
        description: 'Limited write access.',
        permissions: {
          create: permissions
            .filter((key) => key !== 'users:delete' && key !== 'settings:write')
            .map((key) => ({
              permission: {
                connect: { key },
              },
            })),
        },
      },
    })

    const viewerRole = await client.role.create({
      data: {
        name: 'Viewer',
        description: 'Read-only access.',
        permissions: {
          create: permissions
            .filter((key) => key === 'users:read' || key === 'audit:read')
            .map((key) => ({
              permission: {
                connect: { key },
              },
            })),
        },
      },
    })

    const demoPasswordHash1 = await hashPassword('Password123!')
    const demoPasswordHash2 = await hashPassword('Password123!')
    const demoPasswordHash3 = await hashPassword('Password123!')

    await client.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: demoPasswordHash1,
        status: UserStatus.ACTIVE,
        roles: {
          create: [{ role: { connect: { id: adminRole.id } } }],
        },
      },
    })

    await client.user.create({
      data: {
        email: 'manager@example.com',
        name: 'Manager User',
        passwordHash: demoPasswordHash2,
        status: UserStatus.ACTIVE,
        roles: {
          create: [{ role: { connect: { id: managerRole.id } } }],
        },
      },
    })

    await client.user.create({
      data: {
        email: 'viewer@example.com',
        name: 'Viewer User',
        passwordHash: demoPasswordHash3,
        status: UserStatus.ACTIVE,
        roles: {
          create: [{ role: { connect: { id: viewerRole.id } } }],
        },
      },
    })
  })

  console.log('Seeded demo auth roles, permissions, and users.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
