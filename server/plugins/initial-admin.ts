import bcrypt from 'bcrypt'
import { z } from 'zod'
import { UserModel } from '../models/User'
import { connectMongo } from '../utils/db'

const seedAdminSchema = z.object({
  enabled: z.enum(['true', 'false']).default('false'),
  username: z.string().trim().min(3),
  email: z.string().trim().email(),
  password: z.string().min(8)
})

declare global {
  var initialAdminSeedInFlight: Promise<unknown> | undefined
}

const seedInitialAdmin = async () => {
  const enabled = process.env.SEED_ADMIN_ENABLED === 'true'

  const config = seedAdminSchema.safeParse({
    enabled: enabled ? 'true' : 'false',
    username: process.env.SEED_ADMIN_USERNAME || 'admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.SEED_ADMIN_PASSWORD || ''
  })

  if (!enabled) {
    return
  }

  if (!config.success) {
    throw new Error('Variables de administrador inicial invalidas')
  }

  if (config.data.enabled !== 'true') {
    return
  }

  await connectMongo()

  const username = config.data.username.toLowerCase()
  const email = config.data.email.toLowerCase()

  await UserModel.findOneAndUpdate(
    { username },
    {
      name: 'Administrador',
      username,
      email,
      passwordHash: await bcrypt.hash(config.data.password, 12),
      role: 'admin',
      status: 'active'
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  )

  console.info(JSON.stringify({
    level: 'info',
    message: 'Administrador inicial creado o actualizado',
    username,
    email,
    timestamp: new Date().toISOString()
  }))
}

export default defineNitroPlugin(() => {
  if (globalThis.initialAdminSeedInFlight) {
    return
  }

  globalThis.initialAdminSeedInFlight = seedInitialAdmin()
    .catch((error) => {
      console.error(JSON.stringify({
        level: 'error',
        message: 'No se pudo crear el administrador inicial',
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        timestamp: new Date().toISOString()
      }))
    })
    .finally(() => {
      globalThis.initialAdminSeedInFlight = undefined
    })
})
