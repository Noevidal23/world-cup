import type { AdminTeamOption, KnockoutSlotRow } from '../../types/domain'

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

export const serializeKnockoutSlot = (slot: {
  _id: unknown
  stage: KnockoutSlotRow['stage']
  matchNumber: number
  slot: string
  sourceType: KnockoutSlotRow['sourceType']
  sourceLabel: string
  teamId?: unknown
  isManualOverride: boolean
  overrideReason?: string | null
  updatedAt: Date | string
}): KnockoutSlotRow => {
  const team = serializeTeam(slot.teamId)

  return {
    id: String(slot._id),
    stage: slot.stage,
    matchNumber: slot.matchNumber,
    slot: slot.slot,
    sourceType: slot.sourceType,
    sourceLabel: slot.sourceLabel,
    teamId: team?.id || (slot.teamId ? String(slot.teamId) : undefined),
    team,
    isManualOverride: slot.isManualOverride,
    overrideReason: slot.overrideReason || undefined,
    updatedAt: new Date(slot.updatedAt).toISOString()
  }
}
