import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const BestThirdOverrideSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, unique: true },
  qualifiedStatus: {
    type: String,
    enum: ['qualified_best_third', 'possible_best_third', 'eliminated']
  },
  sortOrder: { type: Number, min: 1 },
  justification: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true, required: true }
}, {
  timestamps: true
})

BestThirdOverrideSchema.index({ active: 1, sortOrder: 1 })

export type BestThirdOverrideDocument = InferSchemaType<typeof BestThirdOverrideSchema>
export const BestThirdOverrideModel = (models.BestThirdOverride || model('BestThirdOverride', BestThirdOverrideSchema)) as Model<BestThirdOverrideDocument>
