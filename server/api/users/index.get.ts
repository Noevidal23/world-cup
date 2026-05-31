import { UserModel } from '../../models/User'
import { requireAdminUser } from '../../utils/auth'
import { connectMongo } from '../../utils/db'
import { serializeAdminUser } from '../../utils/users'
import { userQuerySchema } from '../../validators/users'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const query = userQuerySchema.parse(getQuery(event))
  await connectMongo()

  const filters: Record<string, unknown> = {}

  if (query.role !== 'all') {
    filters.role = query.role
  }

  if (query.status !== 'all') {
    filters.status = query.status
  }

  if (query.search) {
    const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filters.$or = [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }

  const skip = (query.page - 1) * query.pageSize
  const [users, total] = await Promise.all([
    UserModel.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    UserModel.countDocuments(filters)
  ])

  return {
    users: users.map(serializeAdminUser),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / query.pageSize))
    }
  }
})
