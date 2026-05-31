import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, trim: true },
  entity: { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  entityId: { type: Schema.Types.ObjectId },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  metadata: { type: Schema.Types.Mixed },
  ip: { type: String, trim: true },
  ipAddress: { type: String, trim: true },
  userAgent: { type: String, trim: true }
}, {
  timestamps: true
})

AuditLogSchema.index({ userId: 1, createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })
AuditLogSchema.index({ entity: 1, entityId: 1 })
AuditLogSchema.index({ entityType: 1, entityId: 1 })
AuditLogSchema.index({ createdAt: -1 })

export type AuditLogDocument = InferSchemaType<typeof AuditLogSchema>
export const AuditLogModel = (models.AuditLog || model('AuditLog', AuditLogSchema)) as Model<AuditLogDocument>
