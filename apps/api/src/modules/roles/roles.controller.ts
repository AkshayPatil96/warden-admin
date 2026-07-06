import type { Request, RequestHandler } from 'express'
import { NotFoundAppError, UnauthorizedAppError } from '../../core/errors/app-error.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import * as rolesService from './roles.service.js'
import type { CreateRoleInput, UpdateRoleInput } from '@admin/shared'

function requireId(req: Request): string {
  const { id } = req.params
  if (!id) {
    throw new NotFoundAppError('Role not found.')
  }
  return id
}

function requireActor(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new UnauthorizedAppError()
  }
  return req.user
}

export const list: RequestHandler = async (_req, res) => {
  res.status(200).json(await rolesService.listRoles())
}

export const listPermissions: RequestHandler = async (_req, res) => {
  res.status(200).json(await rolesService.listPermissions())
}

export const create: RequestHandler = async (req, res) => {
  const role = await rolesService.createRole(req.body as CreateRoleInput, requireActor(req))
  res.status(201).json(role)
}

export const update: RequestHandler = async (req, res) => {
  const role = await rolesService.updateRole(requireId(req), req.body as UpdateRoleInput, requireActor(req))
  res.status(200).json(role)
}

export const remove: RequestHandler = async (req, res) => {
  await rolesService.deleteRole(requireId(req), requireActor(req))
  res.status(204).send()
}
