import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const TeamSchema = new Schema({
  fifaCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  group: { type: String, trim: true },
  flagUrl: { type: String, trim: true },
  isActive: { type: Boolean, default: true, required: true }
}, {
  timestamps: true
})

TeamSchema.index({ group: 1, name: 1 })

export type TeamDocument = InferSchemaType<typeof TeamSchema>
export const TeamModel = (models.Team || model('Team', TeamSchema)) as Model<TeamDocument>
