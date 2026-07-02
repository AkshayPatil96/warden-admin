import { Prisma } from '../../generated/prisma/client.js'
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { writeAudit } from '../../lib/audit.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput, User, UserListResult } from '@admin/shared'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { findRolesByIds, type RoleEntity } from '../roles/roles.repository.js'
import {
  ADMIN_ROLE_NAME,
  countActiveAdmins,
  createUser as createUserRow,
  deleteUser as deleteUserRow,
  findUserById,
  listUsers as listUserRows,
  setUserRoles,
  updateUserScalars,
  type UserEntity,
} from './users.repository.js'

// Maps to the safe shape — passwordHash never leaves the service.
function toUser(entity: UserEntity): User {
  return {
    id: entity.id,
    email: entity.email,
    name: entity.name,
    status: entity.status,
    roles: entity.roles
      .map((ur) => ({ id: ur.role.id, name: ur.role.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function userHasAdmin(entity: UserEntity): boolean {
  return entity.roles.some((ur) => ur.role.name === ADMIN_ROLE_NAME)
}

// Validates the requested role ids exist and returns the resolved role rows.
async function resolveRoles(roleIds: string[], client: Prisma.TransactionClient): Promise<RoleEntity[]> {
  const unique = [...new Set(roleIds)]
  const roles = await findRolesByIds(unique, client)
  if (roles.length !== unique.length) {
    throw new ValidationAppError('One or more roles do not exist.')
  }
  return roles
}

// No privilege escalation: an actor may only grant roles whose permissions they
// themselves already hold. Stops a Manager (users:write) from self-promoting to Admin.
function assertNoEscalation(roles: RoleEntity[], actor: AuthenticatedUser): void {
  const held = new Set(actor.permissions)
  const missing = new Set<string>()
  for (const role of roles) {
    for (const rp of role.permissions) {
      if (!held.has(rp.permission.key)) {
        missing.add(rp.permission.key)
      }
    }
  }
  if (missing.size > 0) {
    throw new ForbiddenAppError(
      `You cannot assign a role granting permissions you do not hold: ${[...missing].sort().join(', ')}.`
    )
  }
}

export async function listUsers(query: ListUsersQuery): Promise<UserListResult> {
  const { data, total } = await listUserRows({
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    order: query.order,
    search: query.search,
    status: query.status,
  })
  return { data: data.map(toUser), total, page: query.page, pageSize: query.pageSize }
}

export async function getUser(id: string): Promise<User> {
  const entity = await findUserById(id)
  if (!entity) {
    throw new NotFoundAppError('User not found.')
  }
  return toUser(entity)
}

export async function createUser(input: CreateUserInput, actor: AuthenticatedUser): Promise<User> {
  const passwordHash = await hashPassword(input.password)

  try {
    return await prisma.$transaction(async (client) => {
      const roles = await resolveRoles(input.roleIds, client)
      assertNoEscalation(roles, actor)

      const created = await createUserRow(
        { email: input.email, name: input.name, passwordHash, roleIds: input.roleIds },
        client
      )
      const user = toUser(created)

      await writeAudit(
        { actorId: actor.id, action: 'user.create', entity: 'user', entityId: user.id, after: user },
        client
      )
      return user
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictAppError('A user with this email already exists.')
    }
    throw error
  }
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: AuthenticatedUser
): Promise<User> {
  return prisma.$transaction(async (client) => {
    const existing = await findUserById(id, client)
    if (!existing) {
      throw new NotFoundAppError('User not found.')
    }

    // You can't lock yourself out.
    if (id === actor.id && input.status === 'SUSPENDED') {
      throw new ForbiddenAppError('You cannot suspend your own account.')
    }

    let nextHasAdmin = userHasAdmin(existing)
    if (input.roleIds) {
      const roles = await resolveRoles(input.roleIds, client)
      assertNoEscalation(roles, actor)
      nextHasAdmin = roles.some((r) => r.name === ADMIN_ROLE_NAME)
    }

    const nextStatus = input.status ?? existing.status
    const wasActiveAdmin = userHasAdmin(existing) && existing.status === 'ACTIVE'
    const willBeActiveAdmin = nextHasAdmin && nextStatus === 'ACTIVE'

    // Don't let the last active Admin lose Admin or be suspended.
    if (wasActiveAdmin && !willBeActiveAdmin && (await countActiveAdmins(client)) === 1) {
      throw new ForbiddenAppError('At least one active Admin must remain.')
    }

    const before = toUser(existing)
    if (input.roleIds) {
      await setUserRoles(id, input.roleIds, client)
    }
    await updateUserScalars(id, { name: input.name, status: input.status }, client)

    const updated = await findUserById(id, client)
    if (!updated) {
      throw new NotFoundAppError('User not found.')
    }
    const after = toUser(updated)

    await writeAudit(
      { actorId: actor.id, action: 'user.update', entity: 'user', entityId: id, before, after },
      client
    )
    return after
  })
}

export async function deleteUser(id: string, actor: AuthenticatedUser): Promise<void> {
  await prisma.$transaction(async (client) => {
    if (id === actor.id) {
      throw new ForbiddenAppError('You cannot delete your own account.')
    }

    const existing = await findUserById(id, client)
    if (!existing) {
      throw new NotFoundAppError('User not found.')
    }

    if (userHasAdmin(existing) && existing.status === 'ACTIVE' && (await countActiveAdmins(client)) === 1) {
      throw new ForbiddenAppError('At least one active Admin must remain.')
    }

    await deleteUserRow(id, client)
    await writeAudit(
      { actorId: actor.id, action: 'user.delete', entity: 'user', entityId: id, before: toUser(existing) },
      client
    )
  })
}
