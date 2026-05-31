import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const PredictionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  predictedHomeGoals: { type: Number, required: true, min: 0 },
  predictedAwayGoals: { type: Number, required: true, min: 0 },
  predictedResult: { type: String, enum: ['home', 'away', 'draw'], required: true },
  predictedExtraTimeHomeGoals: { type: Number, min: 0 },
  predictedExtraTimeAwayGoals: { type: Number, min: 0 },
  predictedExtraTimeResult: { type: String, enum: ['home', 'away', 'draw'] },
  predictedPenaltyHomeGoals: { type: Number, min: 0 },
  predictedPenaltyAwayGoals: { type: Number, min: 0 },
  predictedPenaltyWinner: { type: String, enum: ['home', 'away'] },
  status: { type: String, enum: ['pending', 'evaluated'], default: 'pending', required: true },
  pointsWinner: { type: Number, default: 0, min: 0, required: true },
  pointsExactScore: { type: Number, default: 0, min: 0, required: true },
  totalPoints: { type: Number, default: 0, min: 0, required: true },
  possiblePoints: { type: Number, default: 2, min: 2, required: true }
}, {
  timestamps: true
})

PredictionSchema.index({ userId: 1, matchId: 1 }, { unique: true })
PredictionSchema.index({ matchId: 1 })

export type PredictionDocument = InferSchemaType<typeof PredictionSchema>
export const PredictionModel = (models.Prediction || model('Prediction', PredictionSchema)) as Model<PredictionDocument>
