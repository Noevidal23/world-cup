import mongoose from 'mongoose'
import { MatchModel } from '../../models/Match'
import { PredictionModel } from '../../models/Prediction'
import { rankingService } from '../../services/RankingService'
import { requireParticipantUser } from '../../utils/auth'
import { connectMongo } from '../../utils/db'
import { buildPredictionValues } from '../../utils/predictionValues'
import { getPredictionLockReason, serializePrediction } from '../../utils/predictions'
import { predictionInputSchema } from '../../validators/predictions'

export default defineEventHandler(async (event) => {
  const user = await requireParticipantUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Pronostico invalido'
    })
  }

  const parsed = predictionInputSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Pronostico invalido',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  const prediction = await PredictionModel.findOne({ _id: id, userId: user.id })

  if (!prediction) {
    throw createError({
      statusCode: 404,
      message: 'Pronostico no encontrado'
    })
  }

  if (String(prediction.matchId) !== parsed.data.matchId) {
    throw createError({
      statusCode: 400,
      message: 'El partido del pronostico no puede cambiar'
    })
  }

  const match = await MatchModel.findById(prediction.matchId)

  if (!match) {
    throw createError({
      statusCode: 404,
      message: 'Partido no encontrado'
    })
  }

  const lockReason = getPredictionLockReason(match)

  if (lockReason) {
    throw createError({
      statusCode: 409,
      message: lockReason
    })
  }

  const predictionValues = buildPredictionValues(parsed.data, match)
  prediction.set(predictionValues)
  await prediction.save()
  await rankingService.recalculateAll()

  return {
    prediction: serializePrediction(prediction)
  }
})
