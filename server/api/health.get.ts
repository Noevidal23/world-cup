import mongoose from 'mongoose'
import { connectMongo } from '../utils/db'
import { validateServerEnv } from '../validators/env'

export default defineEventHandler(async (event) => {
  const checkedAt = new Date().toISOString()
  const config = useRuntimeConfig()

  try {
    validateServerEnv(config)
    await connectMongo()

    return {
      ok: true,
      status: 'healthy',
      checkedAt,
      mongo: {
        readyState: mongoose.connection.readyState
      }
    }
  } catch (error) {
    setResponseStatus(event, 503)

    return {
      ok: false,
      status: 'unhealthy',
      checkedAt,
      error: error instanceof Error ? error.message : 'Healthcheck failed'
    }
  }
})
