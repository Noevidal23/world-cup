import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const MatchDisciplineSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  yellowCards: { type: Number, default: 0, min: 0, required: true },
  redCards: { type: Number, default: 0, min: 0, required: true },
  secondYellowRedCards: { type: Number, default: 0, min: 0, required: true }
}, {
  timestamps: true
})

MatchDisciplineSchema.index({ matchId: 1, teamId: 1 }, { unique: true })
MatchDisciplineSchema.index({ teamId: 1 })

export type MatchDisciplineDocument = InferSchemaType<typeof MatchDisciplineSchema>
export const MatchDisciplineModel = (models.MatchDiscipline || model('MatchDiscipline', MatchDisciplineSchema)) as Model<MatchDisciplineDocument>
