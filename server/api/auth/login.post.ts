import bcrypt from 'bcrypt'
import { UserModel } from '../../models/User'
import { loginSchema } from '../../validators/auth'
import { serializeUser } from '../../utils/auth'
import { createAuditLog } from '../../utils/audit'
import { connectMongo } from '../../utils/db'
import { assertRateLimit, clearRateLimit } from '../../utils/rateLimit'
import { setAuthSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Credenciales invalidas',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  const username = parsed.data.username.toLowerCase()
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const rateLimitKey = `login:${ip}:${username}`

  assertRateLimit(rateLimitKey, {
    limit: 5,
    windowMs: 15 * 60 * 1000
  })

  const user = await UserModel.findOne({ username }).select('+passwordHash')

  if (!user || user.status !== 'active') {
    throw createError({
      statusCode: 401,
      message: 'Usuario o contraseña invalidos'
    })
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, user.passwordHash)

  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: 'Usuario o contraseña invalidos'
    })
  }

  setAuthSession(event, String(user._id))
  user.lastLoginAt = new Date()
  await user.save()
  clearRateLimit(rateLimitKey)
  await createAuditLog(event, {
    userId: String(user._id),
    action: 'AUTH_LOGIN',
    entity: 'AuthSession',
    entityId: user._id,
    after: {
      username: user.username,
      role: user.role
    }
  })

  return {
    user: serializeUser(user)
  }
})
