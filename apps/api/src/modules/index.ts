import { Router } from 'express'
import { authRouter } from './auth/auth.routes.js'
import { customerRouter } from './customer/customer.routes.js'
import { subscriptionRouter } from './subscription/subscription.routes.js'
import { invoiceRouter } from './invoice/invoice.routes.js'
import { userRouter } from './users/users.routes.js'
import { roleRouter } from './roles/roles.routes.js'

export const apiV1Router: Router = Router()

apiV1Router.use('/auth', authRouter)
apiV1Router.use('/customers', customerRouter)
apiV1Router.use('/subscriptions', subscriptionRouter)
apiV1Router.use('/invoices', invoiceRouter)
apiV1Router.use('/users', userRouter)
apiV1Router.use('/roles', roleRouter)