import type { MatchResultSide, ScoringMode } from '../../types/domain'

export const calculateResultSide = (homeGoals: number, awayGoals: number): MatchResultSide => {
  if (homeGoals > awayGoals) {
    return 'home'
  }

  if (awayGoals > homeGoals) {
    return 'away'
  }

  return 'draw'
}

export const calculateFinalWinner = (values: {
  scoringMode: ScoringMode
  regularResult: MatchResultSide
  extraTimeResult?: MatchResultSide
  penaltyWinner?: 'home' | 'away'
}) => {
  if (values.scoringMode === 'penalties_final') {
    return values.penaltyWinner
  }

  if (values.scoringMode === 'extra_time') {
    return values.extraTimeResult
  }

  return values.regularResult
}
