import mongoose from 'mongoose'
import { AuditLogModel } from '../models/AuditLog'
import { connectMongo } from './db'

interface AuditInput {
  userId?: string
  action: string
  entity: string
  entityId?: unknown
  before?: unknown
  after?: unknown
}

export const createAuditLog = async (
  event: Parameters<typeof getRequestIP>[0],
  input: AuditInput
) => {
  const ip = getRequestIP(event, { xForwardedFor: true })
  const userAgent = getHeader(event, 'user-agent')

  await connectMongo()

  const entityId = input.entityId instanceof mongoose.Types.ObjectId
    ? input.entityId
    : typeof input.entityId === 'string' && mongoose.isValidObjectId(input.entityId)
      ? new mongoose.Types.ObjectId(input.entityId)
      : undefined

  return AuditLogModel.create({
    userId: input.userId,
    actor: input.userId,
    action: input.action,
    entity: input.entity,
    entityType: input.entity,
    entityId,
    before: input.before,
    after: input.after,
    metadata: input.after,
    ip,
    ipAddress: ip,
    userAgent
  })
}
