import type { Request, RequestHandler } from 'express'
import { NotFoundAppError, UnauthorizedAppError } from '../../core/errors/app-error.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import * as invoiceService from './invoice.service.js'
import type { CreateInvoiceInput, ListInvoicesQuery, UpdateInvoiceInput } from '@admin/shared'

function requireId(req: Request): string {
  const { id } = req.params
  if (!id) {
    throw new NotFoundAppError('Invoice not found.')
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
  const result = await invoiceService.listInvoices(req.query as unknown as ListInvoicesQuery)
  res.status(200).json(result)
}

export const getOne: RequestHandler = async (req, res) => {
  const invoice = await invoiceService.getInvoice(requireId(req))
  res.status(200).json(invoice)
}

export const create: RequestHandler = async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.body as CreateInvoiceInput, requireActor(req))
  res.status(201).json(invoice)
}

export const update: RequestHandler = async (req, res) => {
  const invoice = await invoiceService.updateInvoice(requireId(req), req.body as UpdateInvoiceInput, requireActor(req))
  res.status(200).json(invoice)
}

export const remove: RequestHandler = async (req, res) => {
  await invoiceService.deleteInvoice(requireId(req), requireActor(req))
  res.status(204).send()
}
