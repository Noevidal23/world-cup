import type { AdminMatch, AdminTeamOption } from '../../types/domain'

const serializeTeamOption = (team: unknown): AdminTeamOption | undefined => {
  if (!team || typeof team !== 'object' || !('_id' in team)) {
    return undefined
  }

  const value = team as {
    _id: unknown
    fifaCode: string
    name: string
    group?: string
    flagUrl?: string
  }

  return {
    id: String(value._id),
    fifaCode: value.fifaCode,
    name: value.name,
    group: value.group,
    flagUrl: value.flagUrl
  }
}

export const serializeMatch = (match: {
  _id: unknown
  matchNumber: number
  stage: AdminMatch['stage']
  group?: string | null
  homeTeamId?: unknown
  awayTeamId?: unknown
  homeSlotLabel?: string | null
  awaySlotLabel?: string | null
  kickoffAt: Date | string
  stadium?: string | null
  city?: string | null
  status: AdminMatch['status']
  predictionsLocked: boolean
  scoringMode: AdminMatch['scoringMode']
  partialHomeGoals?: number | null
  partialAwayGoals?: number | null
  partialMinute?: number | null
  partialStatusText?: string | null
  regularHomeGoals?: number | null
  regularAwayGoals?: number | null
  regularResult?: AdminMatch['regularResult'] | null
  extraTimeHomeGoals?: number | null
  extraTimeAwayGoals?: number | null
  extraTimeResult?: AdminMatch['extraTimeResult'] | null
  penaltyHomeGoals?: number | null
  penaltyAwayGoals?: number | null
  penaltyWinner?: AdminMatch['penaltyWinner'] | null
  finalWinner?: AdminMatch['finalWinner'] | null
  createdAt: Date | string
  updatedAt: Date | string
}): AdminMatch => {
  const homeTeam = serializeTeamOption(match.homeTeamId)
  const awayTeam = serializeTeamOption(match.awayTeamId)

  return {
    id: String(match._id),
    matchNumber: match.matchNumber,
    stage: match.stage,
    group: match.group || undefined,
    homeTeamId: homeTeam?.id || (match.homeTeamId ? String(match.homeTeamId) : undefined),
    awayTeamId: awayTeam?.id || (match.awayTeamId ? String(match.awayTeamId) : undefined),
    homeTeam,
    awayTeam,
    homeSlotLabel: match.homeSlotLabel || undefined,
    awaySlotLabel: match.awaySlotLabel || undefined,
    kickoffAt: new Date(match.kickoffAt).toISOString(),
    stadium: match.stadium || undefined,
    city: match.city || undefined,
    status: match.status,
    predictionsLocked: match.predictionsLocked,
    scoringMode: match.scoringMode,
    partialHomeGoals: match.partialHomeGoals ?? undefined,
    partialAwayGoals: match.partialAwayGoals ?? undefined,
    partialMinute: match.partialMinute ?? undefined,
    partialStatusText: match.partialStatusText || undefined,
    regularHomeGoals: match.regularHomeGoals ?? undefined,
    regularAwayGoals: match.regularAwayGoals ?? undefined,
    regularResult: match.regularResult || undefined,
    extraTimeHomeGoals: match.extraTimeHomeGoals ?? undefined,
    extraTimeAwayGoals: match.extraTimeAwayGoals ?? undefined,
    extraTimeResult: match.extraTimeResult || undefined,
    penaltyHomeGoals: match.penaltyHomeGoals ?? undefined,
    penaltyAwayGoals: match.penaltyAwayGoals ?? undefined,
    penaltyWinner: match.penaltyWinner || undefined,
    finalWinner: match.finalWinner || undefined,
    createdAt: new Date(match.createdAt).toISOString(),
    updatedAt: new Date(match.updatedAt).toISOString()
  }
}
