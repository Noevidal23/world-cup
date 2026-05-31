import mongoose from 'mongoose'
import { UserModel } from '../../models/User'
import { requireAdminUser } from '../../utils/auth'
import { connectMongo } from '../../utils/db'
import { serializeAdminUser } from '../../utils/users'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Usuario invalido'
    })
  }

  await connectMongo()
  const user = await UserModel.findById(id)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado'
    })
  }

  return {
    user: serializeAdminUser(user)
  }
})
