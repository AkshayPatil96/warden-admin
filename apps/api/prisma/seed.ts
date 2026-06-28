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
    'billing:read',
    'billing:write',
    'billing:delete',
  ]

  await prisma.$transaction(async (client) => {
    await client.user.deleteMany({})
    await client.role.deleteMany({})
    await client.permission.deleteMany({})
    await client.auditLog.deleteMany({})
    await client.session.deleteMany({})
    await client.invoice.deleteMany({})
    await client.subscription.deleteMany({})
    await client.customer.deleteMany({})

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
            .filter((key) => key !== 'users:delete' && key !== 'settings:write' && key !== 'billing:delete')
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
            .filter((key) => key === 'users:read' || key === 'audit:read' || key === 'billing:read')
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

    await client.customer.createMany({
      data: [
        { name: 'Acme Corp', email: 'billing@acme.test', company: 'Acme Corp', status: 'ACTIVE', mrrCents: 49900 },
        { name: 'Globex', email: 'ap@globex.test', company: 'Globex', status: 'ACTIVE', mrrCents: 129900 },
        { name: 'Initech', email: 'accounts@initech.test', company: 'Initech', status: 'PAST_DUE', mrrCents: 9900 },
        { name: 'Hooli', email: 'finance@hooli.test', company: 'Hooli', status: 'CANCELED', mrrCents: 0 },
      ],
    })

    const acme = await client.customer.findFirst({ where: { email: 'billing@acme.test' } })
    const globex = await client.customer.findFirst({ where: { email: 'ap@globex.test' } })
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const acmeSub = acme
      ? await client.subscription.create({
          data: {
            customerId: acme.id,
            plan: 'PRO',
            status: 'ACTIVE',
            interval: 'MONTHLY',
            priceCents: 49900,
            currentPeriodEnd: periodEnd,
          },
        })
      : null
    if (globex) {
      await client.subscription.create({
        data: {
          customerId: globex.id,
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          interval: 'YEARLY',
          priceCents: 1299900,
          currentPeriodEnd: periodEnd,
        },
      })
    }

    if (acme) {
      await client.invoice.create({
        data: {
          customerId: acme.id,
          subscriptionId: acmeSub?.id ?? null,
          number: 'INV-1001',
          status: 'PAID',
          amountCents: 49900,
          currency: 'usd',
          dueDate,
          paidAt: new Date(),
        },
      })
      await client.invoice.create({
        data: {
          customerId: acme.id,
          subscriptionId: acmeSub?.id ?? null,
          number: 'INV-1002',
          status: 'OPEN',
          amountCents: 49900,
          currency: 'usd',
          dueDate,
        },
      })
    }
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
