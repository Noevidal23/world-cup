import { createError } from 'h3'
import type { MatchStage } from '../../types/domain'
import type { predictionInputSchema } from '../validators/predictions'
import { calculatePredictedResult } from './predictions'

const knockoutStages = new Set<MatchStage>(['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'])

export const buildPredictionValues = (input: typeof predictionInputSchema._output, match: { stage: string }) => {
  const predictedResult = calculatePredictedResult(input.predictedHomeGoals, input.predictedAwayGoals)
  const values: Record<string, unknown> = {
    predictedHomeGoals: input.predictedHomeGoals,
    predictedAwayGoals: input.predictedAwayGoals,
    predictedResult,
    predictedExtraTimeHomeGoals: undefined,
    predictedExtraTimeAwayGoals: undefined,
    predictedExtraTimeResult: undefined,
    predictedPenaltyHomeGoals: undefined,
    predictedPenaltyAwayGoals: undefined,
    predictedPenaltyWinner: undefined
  }

  if (!knockoutStages.has(match.stage as MatchStage) || predictedResult !== 'draw') {
    return values
  }

  if (input.predictedExtraTimeHomeGoals === undefined || input.predictedExtraTimeAwayGoals === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Captura marcador tras tiempos extra'
    })
  }

  if (input.predictedExtraTimeHomeGoals < input.predictedHomeGoals || input.predictedExtraTimeAwayGoals < input.predictedAwayGoals) {
    throw createError({
      statusCode: 400,
      message: 'El marcador tras tiempos extra no puede ser menor al marcador de 90 minutos'
    })
  }

  const predictedExtraTimeResult = calculatePredictedResult(input.predictedExtraTimeHomeGoals, input.predictedExtraTimeAwayGoals)
  values.predictedExtraTimeHomeGoals = input.predictedExtraTimeHomeGoals
  values.predictedExtraTimeAwayGoals = input.predictedExtraTimeAwayGoals
  values.predictedExtraTimeResult = predictedExtraTimeResult

  if (predictedExtraTimeResult !== 'draw') {
    return values
  }

  if (input.predictedPenaltyHomeGoals === undefined || input.predictedPenaltyAwayGoals === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Captura marcador de penales'
    })
  }

  const predictedPenaltyWinner = calculatePredictedResult(input.predictedPenaltyHomeGoals, input.predictedPenaltyAwayGoals)

  if (predictedPenaltyWinner === 'draw') {
    throw createError({
      statusCode: 400,
      message: 'El marcador de penales debe definir un ganador'
    })
  }

  values.predictedPenaltyHomeGoals = input.predictedPenaltyHomeGoals
  values.predictedPenaltyAwayGoals = input.predictedPenaltyAwayGoals
  values.predictedPenaltyWinner = predictedPenaltyWinner

  return values
}
