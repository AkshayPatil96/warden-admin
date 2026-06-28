import type { Request, RequestHandler } from 'express'
import { NotFoundAppError, UnauthorizedAppError } from '../../core/errors/app-error.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import * as customerService from './customer.service.js'
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from '@admin/shared'

function requireId(req: Request): string {
  const { id } = req.params
  if (!id) {
    throw new NotFoundAppError('Customer not found.')
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
  const result = await customerService.listCustomers(req.query as unknown as ListCustomersQuery)
  res.status(200).json(result)
}

export const getOne: RequestHandler = async (req, res) => {
  const customer = await customerService.getCustomer(requireId(req))
  res.status(200).json(customer)
}

export const create: RequestHandler = async (req, res) => {
  const customer = await customerService.createCustomer(req.body as CreateCustomerInput, requireActor(req))
  res.status(201).json(customer)
}

export const update: RequestHandler = async (req, res) => {
  const customer = await customerService.updateCustomer(
    requireId(req),
    req.body as UpdateCustomerInput,
    requireActor(req)
  )
  res.status(200).json(customer)
}

export const remove: RequestHandler = async (req, res) => {
  await customerService.deleteCustomer(requireId(req), requireActor(req))
  res.status(204).send()
}
