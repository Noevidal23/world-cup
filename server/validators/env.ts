import { z } from 'zod'

const envSchema = z.object({
  mongodbUri: z.string().min(1, 'MONGODB_URI is required'),
  sessionSecret: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long')
})

const mongoEnvSchema = z.object({
  mongodbUri: z.string().min(1, 'MONGODB_URI is required')
})

const firstString = (...values: unknown[]) => values.find((value): value is string => typeof value === 'string' && value.length > 0)

const resolveServerEnv = (config: ReturnType<typeof useRuntimeConfig>) => ({
  mongodbUri: firstString(config.mongodbUri, process.env.NUXT_MONGODB_URI, process.env.MONGODB_URI),
  sessionSecret: firstString(config.sessionSecret, process.env.NUXT_SESSION_SECRET, process.env.SESSION_SECRET)
})

export const validateServerEnv = (config: ReturnType<typeof useRuntimeConfig>) => envSchema.parse({
  mongodbUri: resolveServerEnv(config).mongodbUri,
  sessionSecret: resolveServerEnv(config).sessionSecret
})

export const validateMongoEnv = (config: ReturnType<typeof useRuntimeConfig>) => mongoEnvSchema.parse({
  mongodbUri: resolveServerEnv(config).mongodbUri
})
