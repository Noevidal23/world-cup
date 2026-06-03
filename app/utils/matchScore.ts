import type { AdminMatch } from '../../types/domain'

type MatchScoreFields = Pick<
  AdminMatch,
  | 'status'
  | 'regularHomeGoals'
  | 'regularAwayGoals'
  | 'extraTimeHomeGoals'
  | 'extraTimeAwayGoals'
  | 'penaltyHomeGoals'
  | 'penaltyAwayGoals'
  | 'penaltyWinner'
>

export const getFinalScoreLabel = (match: MatchScoreFields) => {
  if (match.status !== 'finished' || match.regularHomeGoals === undefined || match.regularAwayGoals === undefined) {
    return null
  }

  const parts = [`90': ${match.regularHomeGoals}-${match.regularAwayGoals}`]

  if (match.extraTimeHomeGoals !== undefined && match.extraTimeAwayGoals !== undefined) {
    parts.push(`TE: ${match.extraTimeHomeGoals}-${match.extraTimeAwayGoals}`)
  }

  if (match.penaltyHomeGoals !== undefined && match.penaltyAwayGoals !== undefined) {
    parts.push(`Pen: ${match.penaltyHomeGoals}-${match.penaltyAwayGoals}`)
  }

  return parts.join(' · ')
}
