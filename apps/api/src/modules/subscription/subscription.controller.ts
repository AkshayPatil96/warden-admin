import type { Request, RequestHandler } from 'express'
import { NotFoundAppError, UnauthorizedAppError } from '../../core/errors/app-error.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import * as subscriptionService from './subscription.service.js'
import type { CreateSubscriptionInput, ListSubscriptionsQuery, UpdateSubscriptionInput } from '@admin/shared'

function requireId(req: Request): string {
  const { id } = req.params
  if (!id) {
    throw new NotFoundAppError('Subscription not found.')
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
  const result = await subscriptionService.listSubscriptions(req.query as unknown as ListSubscriptionsQuery)
  res.status(200).json(result)
}

export const getOne: RequestHandler = async (req, res) => {
  const subscription = await subscriptionService.getSubscription(requireId(req))
  res.status(200).json(subscription)
}

export const create: RequestHandler = async (req, res) => {
  const subscription = await subscriptionService.createSubscription(
    req.body as CreateSubscriptionInput,
    requireActor(req)
  )
  res.status(201).json(subscription)
}

export const update: RequestHandler = async (req, res) => {
  const subscription = await subscriptionService.updateSubscription(
    requireId(req),
    req.body as UpdateSubscriptionInput,
    requireActor(req)
  )
  res.status(200).json(subscription)
}

export const remove: RequestHandler = async (req, res) => {
  await subscriptionService.deleteSubscription(requireId(req), requireActor(req))
  res.status(204).send()
}
