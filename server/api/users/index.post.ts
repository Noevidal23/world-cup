import bcrypt from 'bcrypt'
import { UserModel } from '../../models/User'
import { requireAdminUser } from '../../utils/auth'
import { createAuditLog } from '../../utils/audit'
import { connectMongo } from '../../utils/db'
import { isDuplicateUserKeyError, serializeAdminUser } from '../../utils/users'
import { createUserSchema } from '../../validators/users'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)

  const parsed = createUserSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Datos invalidos',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  try {
    const user = await UserModel.create({
      name: parsed.data.name,
      username: parsed.data.username.toLowerCase(),
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role,
      status: parsed.data.status
    })
    const serialized = serializeAdminUser(user)

    await createAuditLog(event, {
      userId: admin.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user._id,
      after: serialized
    })

    return {
      user: serialized
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
