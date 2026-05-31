import type { AdminUser } from '../../types/domain'

export const serializeAdminUser = (user: {
  _id: unknown
  name: string
  username: string
  email: string
  role: AdminUser['role']
  status: AdminUser['status']
  createdAt: Date | string
  updatedAt: Date | string
}): AdminUser => ({
  id: String(user._id),
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: new Date(user.createdAt).toISOString(),
  updatedAt: new Date(user.updatedAt).toISOString()
})

export const isDuplicateUserKeyError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false
  }

  return 'code' in error && error.code === 11000
}
