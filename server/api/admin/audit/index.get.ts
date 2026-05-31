import mongoose from 'mongoose'
import { AuditLogModel } from '../../../models/AuditLog'
import { requireAdminUser } from '../../../utils/auth'
import { connectMongo } from '../../../utils/db'
import { serializeAuditLog } from '../../../utils/auditLogs'
import { auditQuerySchema } from '../../../validators/audit'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const parsed = auditQuerySchema.safeParse(getQuery(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Filtros invalidos',
      data: parsed.error.flatten()
    })
  }

  const query = parsed.data

  if (query.userId !== 'all' && !mongoose.isValidObjectId(query.userId)) {
    throw createError({
      statusCode: 400,
      message: 'Usuario invalido'
    })
  }

  await connectMongo()

  const filters: Record<string, unknown> = {}

  if (query.userId !== 'all') {
    filters.userId = query.userId
  }

  if (query.action !== 'all') {
    filters.action = query.action
  }

  if (query.entity !== 'all') {
    filters.$or = [
      { entity: query.entity },
      { entityType: query.entity }
    ]
  }

  if (query.from || query.to) {
    filters.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {})
    }
  }

  const skip = (query.page - 1) * query.pageSize
  const [logs, total, actions, entities, legacyEntities] = await Promise.all([
    AuditLogModel.find(filters)
      .populate('userId', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.pageSize),
    AuditLogModel.countDocuments(filters),
    AuditLogModel.distinct('action'),
    AuditLogModel.distinct('entity'),
    AuditLogModel.distinct('entityType')
  ])
  const entityOptions = Array.from(new Set([...entities, ...legacyEntities]))

  return {
    logs: logs.map(serializeAuditLog),
    filters: {
      actions: actions.filter(Boolean).sort(),
      entities: entityOptions.filter(Boolean).sort()
    },
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / query.pageSize))
    }
  }
})
