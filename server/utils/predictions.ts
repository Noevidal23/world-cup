import type { ParticipantPrediction, PredictedResult } from '../../types/domain'

export const calculatePredictedResult = (homeGoals: number, awayGoals: number): PredictedResult => {
  if (homeGoals > awayGoals) {
    return 'home'
  }

  if (awayGoals > homeGoals) {
    return 'away'
  }

  return 'draw'
}

export const serializePrediction = (prediction: {
  _id: unknown
  userId: unknown
  matchId: unknown
  predictedHomeGoals: number
  predictedAwayGoals: number
  predictedResult: ParticipantPrediction['predictedResult']
  predictedExtraTimeHomeGoals?: number | null
  predictedExtraTimeAwayGoals?: number | null
  predictedExtraTimeResult?: ParticipantPrediction['predictedExtraTimeResult'] | null
  predictedPenaltyHomeGoals?: number | null
  predictedPenaltyAwayGoals?: number | null
  predictedPenaltyWinner?: ParticipantPrediction['predictedPenaltyWinner'] | null
  status: ParticipantPrediction['status']
  pointsWinner: number
  pointsExactScore: number
  totalPoints: number
  possiblePoints?: number
  createdAt: Date | string
  updatedAt: Date | string
}): ParticipantPrediction => ({
  id: String(prediction._id),
  userId: String(prediction.userId),
  matchId: String(prediction.matchId),
  predictedHomeGoals: prediction.predictedHomeGoals,
  predictedAwayGoals: prediction.predictedAwayGoals,
  predictedResult: prediction.predictedResult,
  predictedExtraTimeHomeGoals: prediction.predictedExtraTimeHomeGoals ?? undefined,
  predictedExtraTimeAwayGoals: prediction.predictedExtraTimeAwayGoals ?? undefined,
  predictedExtraTimeResult: prediction.predictedExtraTimeResult || undefined,
  predictedPenaltyHomeGoals: prediction.predictedPenaltyHomeGoals ?? undefined,
  predictedPenaltyAwayGoals: prediction.predictedPenaltyAwayGoals ?? undefined,
  predictedPenaltyWinner: prediction.predictedPenaltyWinner || undefined,
  status: prediction.status,
  pointsWinner: prediction.pointsWinner,
  pointsExactScore: prediction.pointsExactScore,
  totalPoints: prediction.totalPoints,
  possiblePoints: prediction.possiblePoints || 2,
  createdAt: new Date(prediction.createdAt).toISOString(),
  updatedAt: new Date(prediction.updatedAt).toISOString()
})

export const getPredictionLockReason = (match: { predictionsLocked: boolean, status?: string }) => {
  if (match.status === 'live') {
    return 'El partido ya inició'
  }

  if (match.status === 'finished') {
    return 'El partido ya finalizó'
  }

  if (match.predictionsLocked) {
    return 'Pronósticos cerrados'
  }

  return undefined
}
