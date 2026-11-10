import express from 'express'
import { port } from './config/config.service.js'
import { dbConnect } from './database/connection.js'
import { authController } from './modules/auth/index.js'
import { userController } from './modules/user/index.js'
import { globalErrorHandler } from './common/middleware/error-handler.js'

const bootstrap = async () => {
  const app = express()

  app.use(express.json())

  await dbConnect()

  app.get('/', (req, res) => {
    return res.status(200).json({ message: "I'm alive" })
  })

  app.use('/auth', authController)
  app.use('/user', userController)

  app.use(globalErrorHandler)

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
  })
}

bootstrap()
