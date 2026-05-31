import mongoose from 'mongoose'
import { UserModel } from '../../models/User'
import { requireAdminUser } from '../../utils/auth'
import { createAuditLog } from '../../utils/audit'
import { connectMongo } from '../../utils/db'
import { isDuplicateUserKeyError, serializeAdminUser } from '../../utils/users'
import { updateUserSchema } from '../../validators/users'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)

  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Usuario invalido'
    })
  }

  const parsed = updateUserSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Datos invalidos',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  try {
    const existing = await UserModel.findById(id)

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Usuario no encontrado'
      })
    }

    const before = serializeAdminUser(existing)
    const user = await UserModel.findByIdAndUpdate(id, {
      name: parsed.data.name,
      username: parsed.data.username.toLowerCase(),
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      status: parsed.data.status
    }, {
      returnDocument: 'after',
      runValidators: true
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'Usuario no encontrado'
      })
    }
    const after = serializeAdminUser(user)

    await createAuditLog(event, {
      userId: admin.id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user._id,
      before,
      after
    })

    return {
      user: after
    }
  } catch (error) {
    if (isDuplicateUserKeyError(error)) {
      throw createError({
        statusCode: 409,
        message: 'El email o usuario ya existe'
      })
    }

    throw error
  }
})
