import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const GroupStandingSchema = new Schema({
  group: { type: String, required: true, trim: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  played: { type: Number, default: 0, min: 0, required: true },
  won: { type: Number, default: 0, min: 0, required: true },
  drawn: { type: Number, default: 0, min: 0, required: true },
  lost: { type: Number, default: 0, min: 0, required: true },
  goalsFor: { type: Number, default: 0, min: 0, required: true },
  goalsAgainst: { type: Number, default: 0, min: 0, required: true },
  goalDifference: { type: Number, default: 0, required: true },
  points: { type: Number, default: 0, min: 0, required: true },
  yellowCards: { type: Number, default: 0, min: 0, required: true },
  redCards: { type: Number, default: 0, min: 0, required: true },
  fairPlayPoints: { type: Number, default: 0, required: true },
  position: { type: Number, min: 1, required: true },
  qualifiedStatus: {
    type: String,
    enum: ['pending', 'qualified_direct', 'possible_best_third', 'qualified_best_third', 'eliminated'],
    default: 'pending',
    required: true
  }
}, {
  timestamps: true
})

GroupStandingSchema.index({ group: 1, position: 1 })
GroupStandingSchema.index({ group: 1, teamId: 1 }, { unique: true })

export type GroupStandingDocument = InferSchemaType<typeof GroupStandingSchema>
export const GroupStandingModel = (models.GroupStanding || model('GroupStanding', GroupStandingSchema)) as Model<GroupStandingDocument>
