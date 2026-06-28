import { Router } from 'express'
import { authRouter } from './auth/auth.routes.js'
import { customerRouter } from './customer/customer.routes.js'

export const apiV1Router: Router = Router()

apiV1Router.use('/auth', authRouter)
apiV1Router.use('/customers', customerRouter)