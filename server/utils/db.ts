import mongoose from 'mongoose'
import { validateMongoEnv } from '../validators/env'

declare global {
  var mongooseConnection: Promise<typeof mongoose> | undefined
}

export const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (!globalThis.mongooseConnection) {
    const config = useRuntimeConfig()
    const env = validateMongoEnv(config)

    mongoose.set('bufferCommands', false)
    globalThis.mongooseConnection = mongoose.connect(env.mongodbUri)
  }

  return globalThis.mongooseConnection
}
