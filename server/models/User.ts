import mongoose, { type InferSchemaType, type Model } from 'mongoose'

const { Schema, model, models } = mongoose

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['participant', 'admin'], default: 'participant', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', required: true },
  lastLoginAt: { type: Date }
}, {
  timestamps: true
})

export type UserDocument = InferSchemaType<typeof UserSchema>
export const UserModel = (models.User || model('User', UserSchema)) as Model<UserDocument>
