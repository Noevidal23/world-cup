import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { UserModel } from '../../../models/User'
import { requireAdminUser } from '../../../utils/auth'
import { createAuditLog } from '../../../utils/audit'
import { connectMongo } from '../../../utils/db'
import { serializeAdminUser } from '../../../utils/users'
import { resetPasswordSchema } from '../../../validators/users'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)

  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Usuario invalido'
    })
  }

  const parsed = resetPasswordSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Password invalido',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()
  const user = await UserModel.findByIdAndUpdate(id, {
    passwordHash: await bcrypt.hash(parsed.data.password, 12)
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
  const serialized = serializeAdminUser(user)

  await createAuditLog(event, {
    userId: admin.id,
    action: 'USER_PASSWORD_RESET',
    entity: 'User',
    entityId: user._id,
    after: {
      id: serialized.id,
      username: serialized.username
    }
  })

  return {
    user: serialized
  }
})
