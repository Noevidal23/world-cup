export const serializeAuditLog = (log: {
  _id: unknown
  action: string
  entity?: string
  entityType?: string
  entityId?: unknown
  before?: unknown
  after?: unknown
  metadata?: unknown
  ip?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  userId?: unknown
  createdAt: Date | string
}) => {
  const populatedUser = log.userId && typeof log.userId === 'object' && 'name' in log.userId && 'username' in log.userId
    ? log.userId as { _id: unknown, name: string, username: string }
    : null

  return {
    id: String(log._id),
    user: populatedUser
      ? {
          id: String(populatedUser._id),
          name: populatedUser.name,
          username: populatedUser.username
        }
      : undefined,
    action: log.action,
    entity: log.entity || log.entityType,
    entityId: log.entityId ? String(log.entityId) : undefined,
    before: log.before,
    after: log.after || log.metadata,
    ip: log.ip || log.ipAddress,
    userAgent: log.userAgent,
    createdAt: new Date(log.createdAt).toISOString()
  }
}
