import { z } from 'zod'

const envSchema = z.object({
  mongodbUri: z.string().min(1, 'MONGODB_URI is required'),
  sessionSecret: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long')
})

const mongoEnvSchema = z.object({
  mongodbUri: z.string().min(1, 'MONGODB_URI is required')
})

export const validateServerEnv = (config: ReturnType<typeof useRuntimeConfig>) => envSchema.parse({
  mongodbUri: config.mongodbUri,
  sessionSecret: config.sessionSecret
})

export const validateMongoEnv = (config: ReturnType<typeof useRuntimeConfig>) => mongoEnvSchema.parse({
  mongodbUri: config.mongodbUri
})
