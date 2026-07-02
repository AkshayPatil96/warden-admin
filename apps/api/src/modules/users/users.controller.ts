import type { Request, RequestHandler } from 'express'
import { NotFoundAppError, UnauthorizedAppError } from '../../core/errors/app-error.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import * as usersService from './users.service.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from '@admin/shared'

function requireId(req: Request): string {
  const { id } = req.params
  if (!id) {
    throw new NotFoundAppError('User not found.')
  }
  return id
}

function requireActor(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new UnauthorizedAppError()
  }
  return req.user
}

export const list: RequestHandler = async (req, res) => {
  res.status(200).json(await usersService.listUsers(req.query as unknown as ListUsersQuery))
}

export const getOne: RequestHandler = async (req, res) => {
  res.status(200).json(await usersService.getUser(requireId(req)))
}

export const create: RequestHandler = async (req, res) => {
  const user = await usersService.createUser(req.body as CreateUserInput, requireActor(req))
  res.status(201).json(user)
}

export const update: RequestHandler = async (req, res) => {
  const user = await usersService.updateUser(requireId(req), req.body as UpdateUserInput, requireActor(req))
  res.status(200).json(user)
}

export const remove: RequestHandler = async (req, res) => {
  await usersService.deleteUser(requireId(req), requireActor(req))
  res.status(204).send()
}
