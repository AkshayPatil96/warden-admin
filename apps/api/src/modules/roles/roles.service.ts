import type { Role, RoleListResult } from '@admin/shared'
import { listRoles as listRoleRows, type RoleEntity } from './roles.repository.js'

export function toRole(entity: RoleEntity): Role {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    permissions: entity.permissions.map((rp) => rp.permission.key).sort(),
  }
}

export async function listRoles(): Promise<RoleListResult> {
  const rows = await listRoleRows()
  return { data: rows.map(toRole) }
}
