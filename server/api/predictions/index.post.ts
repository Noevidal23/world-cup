import { MatchModel } from '../../models/Match'
import { PredictionModel } from '../../models/Prediction'
import { rankingService } from '../../services/RankingService'
import { requireParticipantUser } from '../../utils/auth'
import { connectMongo } from '../../utils/db'
import { calculatePredictedResult, getPredictionLockReason, serializePrediction } from '../../utils/predictions'
import { predictionInputSchema } from '../../validators/predictions'

const knockoutStages = new Set(['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'])

const buildPredictionValues = (input: typeof predictionInputSchema._output, match: { stage: string }) => {
  const predictedResult = calculatePredictedResult(input.predictedHomeGoals, input.predictedAwayGoals)
  const values: Record<string, unknown> = {
    predictedHomeGoals: input.predictedHomeGoals,
    predictedAwayGoals: input.predictedAwayGoals,
    predictedResult
  }

  if (!knockoutStages.has(match.stage) || predictedResult !== 'draw') {
    return values
  }

  if (input.predictedExtraTimeHomeGoals === undefined || input.predictedExtraTimeAwayGoals === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Captura marcador tras tiempos extra'
    })
  }

  const predictedExtraTimeResult = calculatePredictedResult(input.predictedExtraTimeHomeGoals, input.predictedExtraTimeAwayGoals)
  values.predictedExtraTimeHomeGoals = input.predictedExtraTimeHomeGoals
  values.predictedExtraTimeAwayGoals = input.predictedExtraTimeAwayGoals
  values.predictedExtraTimeResult = predictedExtraTimeResult

  if (predictedExtraTimeResult !== 'draw') {
    return values
  }

  if (input.predictedPenaltyHomeGoals === undefined || input.predictedPenaltyAwayGoals === undefined || !input.predictedPenaltyWinner) {
    throw createError({
      statusCode: 400,
      message: 'Captura marcador y ganador por penales'
    })
  }

  values.predictedPenaltyHomeGoals = input.predictedPenaltyHomeGoals
  values.predictedPenaltyAwayGoals = input.predictedPenaltyAwayGoals
  values.predictedPenaltyWinner = input.predictedPenaltyWinner

  return values
}

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
