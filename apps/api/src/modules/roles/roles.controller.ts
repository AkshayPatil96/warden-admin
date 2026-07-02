import type { RequestHandler } from 'express'
import * as rolesService from './roles.service.js'

export const list: RequestHandler = async (_req, res) => {
  res.status(200).json(await rolesService.listRoles())
}
