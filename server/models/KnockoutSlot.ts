import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const KnockoutSlotSchema = new Schema({
  stage: {
    type: String,
    enum: ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'],
    required: true
  },
  matchNumber: { type: Number, required: true, min: 1 },
  slot: { type: String, required: true, trim: true },
  sourceType: {
    type: String,
    enum: ['group_winner', 'group_runner_up', 'best_third', 'match_winner', 'manual'],
    required: true
  },
  sourceLabel: { type: String, required: true, trim: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  isManualOverride: { type: Boolean, default: false, required: true },
  overrideReason: { type: String, trim: true }
}, {
  timestamps: true
})

KnockoutSlotSchema.index({ matchNumber: 1, slot: 1 }, { unique: true })
KnockoutSlotSchema.index({ stage: 1, matchNumber: 1 })

export type KnockoutSlotDocument = InferSchemaType<typeof KnockoutSlotSchema>
export const KnockoutSlotModel = (models.KnockoutSlot || model('KnockoutSlot', KnockoutSlotSchema)) as Model<KnockoutSlotDocument>
