import mongoose from 'mongoose'
import { validateMongoEnv } from '../validators/env'

declare global {
  var mongooseConnection: Promise<typeof mongoose> | undefined
  var mongooseConnectionLogged: boolean | undefined
}

const sanitizeMongoUri = (uri: string) => {
  try {
    const parsed = new URL(uri)
    parsed.username = parsed.username ? '***' : ''
    parsed.password = parsed.password ? '***' : ''

    return {
      uri: parsed.toString(),
      host: parsed.host,
      database: parsed.pathname.replace(/^\//, '') || undefined
    }
  } catch {
    return {
      uri: 'invalid-uri',
      host: undefined,
      database: undefined
    }
  }
}

const logMongoConnection = (level: 'info' | 'error', message: string, payload: Record<string, unknown>) => {
  const log = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload
  })

  if (level === 'error') {
    console.error(log)
    return
  }

  console.info(log)
}

export const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) {
    if (!globalThis.mongooseConnectionLogged) {
      logMongoConnection('info', 'Conexion a MongoDB exitosa', {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        database: mongoose.connection.name
      })
      globalThis.mongooseConnectionLogged = true
    }

    return mongoose
  }

  if (!globalThis.mongooseConnection) {
    const config = useRuntimeConfig()
    const env = validateMongoEnv(config)
    const mongo = sanitizeMongoUri(env.mongodbUri)
    console.log('Connecting to MongoDB with URI:', mongo.uri)

    mongoose.set('bufferCommands', false)
    globalThis.mongooseConnection = mongoose.connect(env.mongodbUri)
    // globalThis.mongooseConnection = mongoose.connect('mongodb://wcuser:worldcup123@127.0.0.1:27017/worldcup?authSource=worldcup')
      .then((connection) => {
        logMongoConnection('info', 'Conexion a MongoDB exitosa', {
          readyState: connection.connection.readyState,
          host: connection.connection.host || mongo.host,
          database: connection.connection.name || mongo.database
        })
        globalThis.mongooseConnectionLogged = true

        return connection
      })
      .catch((error) => {
        logMongoConnection('error', 'Fallo la conexion a MongoDB', {
          readyState: mongoose.connection.readyState,
          host: mongo.host,
          database: mongo.database,
          reason: error instanceof Error ? error.message : String(error)
        })

        globalThis.mongooseConnection = undefined
        globalThis.mongooseConnectionLogged = false

        throw error
      })
  }

  return globalThis.mongooseConnection
}
