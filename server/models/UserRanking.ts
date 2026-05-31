import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const UserRankingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalPoints: { type: Number, default: 0, min: 0, required: true },
  predictionsSubmitted: { type: Number, default: 0, min: 0, required: true },
  predictionsEvaluated: { type: Number, default: 0, min: 0, required: true },
  winnerPoints: { type: Number, default: 0, min: 0, required: true },
  exactScorePoints: { type: Number, default: 0, min: 0, required: true },
  effectivenessPercentage: { type: Number, default: 0, min: 0, required: true },
  lastPredictionAt: { type: Date },
  rank: { type: Number, default: 0, min: 0, required: true }
}, {
  timestamps: true
})

UserRankingSchema.index({ totalPoints: -1, exactScorePoints: -1, winnerPoints: -1, predictionsSubmitted: -1, lastPredictionAt: 1 })

export type UserRankingDocument = InferSchemaType<typeof UserRankingSchema>
export const UserRankingModel = (models.UserRanking || model('UserRanking', UserRankingSchema)) as Model<UserRankingDocument>
