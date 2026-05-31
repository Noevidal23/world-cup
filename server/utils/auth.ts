import { UserModel } from '../models/User'
import { connectMongo } from './db'
import { clearAuthSession, getAuthSession } from './session'
import type { AuthUser } from '../../types/domain'

export const serializeUser = (user: {
  _id: unknown
  name: string
  username: string
  email: string
  role: AuthUser['role']
  status: AuthUser['status']
}): AuthUser => ({
  id: String(user._id),
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  status: user.status
})

export const getSessionUser = async (event: Parameters<typeof getAuthSession>[0]) => {
  const session = getAuthSession(event)

  if (!session) {
    return null
  }

  await connectMongo()

  const user = await UserModel.findById(session.userId)

  if (!user || user.status !== 'active') {
    clearAuthSession(event)
    return null
  }

  return serializeUser(user)
}

export const requireSessionUser = async (event: Parameters<typeof getAuthSession>[0]) => {
  const user = await getSessionUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'No autenticado'
    })
  }

  return user
}

export const requireAdminUser = async (event: Parameters<typeof getAuthSession>[0]) => {
  const user = await requireSessionUser(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'No autorizado'
    })
  }

  return user
}

export const requireParticipantUser = async (event: Parameters<typeof getAuthSession>[0]) => {
  const user = await requireSessionUser(event)

  if (user.role !== 'participant') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Solo los participantes pueden realizar pronósticos'
    })
  }

  return user
}
