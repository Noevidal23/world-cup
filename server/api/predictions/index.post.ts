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
  const parsed = predictionInputSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Pronostico invalido',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  const match = await MatchModel.findById(parsed.data.matchId)

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

  try {
    const prediction = await PredictionModel.create({
      userId: user.id,
      matchId: match._id,
      ...predictionValues
    })
    await rankingService.recalculateAll()

    return {
      prediction: serializePrediction(prediction)
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un pronostico para este partido'
      })
    }

    throw error
  }
})
