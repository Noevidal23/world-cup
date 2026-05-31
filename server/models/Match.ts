import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const MatchSchema = new Schema({
  externalId: { type: String, required: true, unique: true, trim: true },
  matchNumber: { type: Number, required: true, unique: true, min: 1 },
  stage: {
    type: String,
    enum: ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'],
    required: true
  },
  group: { type: String, trim: true },
  homeTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  awayTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  homeSlotLabel: { type: String, trim: true },
  awaySlotLabel: { type: String, trim: true },
  kickoffAt: { type: Date, required: true },
  stadium: { type: String, trim: true },
  city: { type: String, trim: true },
  status: { type: String, enum: ['scheduled', 'live', 'finished', 'cancelled'], default: 'scheduled', required: true },
  predictionsLocked: { type: Boolean, default: false, required: true },
  scoringMode: {
    type: String,
    enum: ['regular_time', 'extra_time', 'penalties_final'],
    default: 'regular_time',
    required: true
  },
  partialHomeGoals: { type: Number, min: 0 },
  partialAwayGoals: { type: Number, min: 0 },
  partialMinute: { type: Number, min: 0, max: 130 },
  partialStatusText: { type: String, trim: true },
  regularHomeGoals: { type: Number, min: 0 },
  regularAwayGoals: { type: Number, min: 0 },
  regularResult: { type: String, enum: ['home', 'away', 'draw'] },
  extraTimeHomeGoals: { type: Number, min: 0 },
  extraTimeAwayGoals: { type: Number, min: 0 },
  extraTimeResult: { type: String, enum: ['home', 'away', 'draw'] },
  penaltyHomeGoals: { type: Number, min: 0 },
  penaltyAwayGoals: { type: Number, min: 0 },
  penaltyWinner: { type: String, enum: ['home', 'away'] },
  finalWinner: { type: String, enum: ['home', 'away', 'draw'] }
}, {
  timestamps: true
})

MatchSchema.index({ kickoffAt: 1 })
MatchSchema.index({ stage: 1, group: 1 })

export type MatchDocument = InferSchemaType<typeof MatchSchema>
export const MatchModel = (models.Match || model('Match', MatchSchema)) as Model<MatchDocument>
