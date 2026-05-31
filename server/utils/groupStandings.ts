import type { AdminTeamOption, GroupStandingRow } from '../../types/domain'

const serializeTeam = (team: unknown): AdminTeamOption | undefined => {
  if (!team || typeof team !== 'object' || !('_id' in team)) {
    return undefined
  }

  const value = team as {
    _id: unknown
    fifaCode: string
    name: string
    group?: string | null
    flagUrl?: string | null
  }

  return {
    id: String(value._id),
    fifaCode: value.fifaCode,
    name: value.name,
    group: value.group || undefined,
    flagUrl: value.flagUrl || undefined
  }
}

export const serializeGroupStanding = (standing: {
  _id: unknown
  group: string
  teamId: unknown
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  yellowCards: number
  redCards: number
  fairPlayPoints: number
  position: number
  qualifiedStatus: GroupStandingRow['qualifiedStatus']
  updatedAt: Date | string
}): GroupStandingRow => {
  const team = serializeTeam(standing.teamId)

  return {
    id: String(standing._id),
    group: standing.group,
    teamId: team?.id || String(standing.teamId),
    team,
    played: standing.played,
    won: standing.won,
    drawn: standing.drawn,
    lost: standing.lost,
    goalsFor: standing.goalsFor,
    goalsAgainst: standing.goalsAgainst,
    goalDifference: standing.goalDifference,
    points: standing.points,
    yellowCards: standing.yellowCards,
    redCards: standing.redCards,
    fairPlayPoints: standing.fairPlayPoints,
    position: standing.position,
    qualifiedStatus: standing.qualifiedStatus,
    updatedAt: new Date(standing.updatedAt).toISOString()
  }
}
