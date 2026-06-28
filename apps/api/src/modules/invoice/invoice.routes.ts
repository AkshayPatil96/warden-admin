import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { writeLimiter } from '../../middleware/rate-limit.js'
import { createInvoiceSchema, listInvoicesQuerySchema, updateInvoiceSchema } from '@admin/shared'
import * as controller from './invoice.controller.js'

// Invoices are part of the billing domain — reuse the billing:* permissions.
// Pattern: authenticate -> authorize('billing:<action>') -> validate -> controller.
export const invoiceRouter: Router = Router()

invoiceRouter.use(authenticate)

invoiceRouter.get(
  '/',
  authorize('billing:read'),
  validate(listInvoicesQuerySchema, 'query'),
  asyncHandler(controller.list)
)
invoiceRouter.get('/:id', authorize('billing:read'), asyncHandler(controller.getOne))
invoiceRouter.post(
  '/',
  writeLimiter,
  authorize('billing:write'),
  validate(createInvoiceSchema),
  asyncHandler(controller.create)
)
invoiceRouter.patch(
  '/:id',
  writeLimiter,
  authorize('billing:write'),
  validate(updateInvoiceSchema),
  asyncHandler(controller.update)
)
invoiceRouter.delete('/:id', writeLimiter, authorize('billing:delete'), asyncHandler(controller.remove))
