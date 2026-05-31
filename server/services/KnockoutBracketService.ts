import { GroupStandingModel } from '../models/GroupStanding'
import { KnockoutSlotModel } from '../models/KnockoutSlot'
import { MatchModel } from '../models/Match'
import { TeamModel } from '../models/Team'
import { bestThirdsService } from './BestThirdsService'
import { connectMongo } from '../utils/db'
import { serializeKnockoutSlot } from '../utils/knockout'
import { serializeMatch } from '../utils/matches'
import type { KnockoutSourceType, MatchResultSide, MatchStage } from '../../types/domain'

type KnockoutStage = Exclude<MatchStage, 'group'>

interface SlotSeed {
  stage: KnockoutStage
  matchNumber: number
  slot: 'home' | 'away'
  sourceType: KnockoutSourceType
  sourceLabel: string
}

const parseSlotSeed = (match: {
  stage: MatchStage
  matchNumber: number
  homeSlotLabel?: string | null
  awaySlotLabel?: string | null
}): SlotSeed[] => {
  if (match.stage === 'group') {
    return []
  }

  return [
    match.homeSlotLabel ? createSlotSeed(match.stage, match.matchNumber, 'home', match.homeSlotLabel) : undefined,
    match.awaySlotLabel ? createSlotSeed(match.stage, match.matchNumber, 'away', match.awaySlotLabel) : undefined
  ].filter(Boolean) as SlotSeed[]
}

const createSlotSeed = (stage: KnockoutStage, matchNumber: number, slot: 'home' | 'away', label: string): SlotSeed => {
  const normalized = label.trim()
  const lower = normalized.toLowerCase()

  if (/^(winner|w)\s+group\s+/i.test(normalized) || /^ganador\s+grupo\s+/i.test(normalized) || /^w-[a-z0-9]+$/i.test(normalized)) {
    return { stage, matchNumber, slot, sourceType: 'group_winner', sourceLabel: normalized }
  }

  if (/^(runner-up|runner up|second|2nd)\s+group\s+/i.test(normalized) || /^segundo\s+grupo\s+/i.test(normalized) || /^r-[a-z0-9]+$/i.test(normalized)) {
    return { stage, matchNumber, slot, sourceType: 'group_runner_up', sourceLabel: normalized }
  }

  if (lower.includes('best third') || lower.includes('mejor tercero') || /^bt-?\d+/i.test(normalized)) {
    return { stage, matchNumber, slot, sourceType: 'best_third', sourceLabel: normalized }
  }

  if (lower.includes('winner match') || lower.includes('ganador partido') || /^w\d+$/i.test(normalized)) {
    return { stage, matchNumber, slot, sourceType: 'match_winner', sourceLabel: normalized }
  }

  return { stage, matchNumber, slot, sourceType: 'manual', sourceLabel: normalized }
}

const extractGroup = (label: string) => {
  const groupMatch = label.match(/(?:group|grupo)\s+([a-z0-9]+)/i)

  if (groupMatch?.[1]) {
    return groupMatch[1].toUpperCase()
  }

  const compactMatch = label.match(/^[wr]-([a-z0-9]+)$/i)

  if (compactMatch?.[1]) {
    return compactMatch[1].toUpperCase()
  }

  return undefined
}

const extractOrdinal = (label: string) => {
  const match = label.match(/(\d+)/)

  return match?.[1] ? Number(match[1]) : undefined
}

const extractMatchNumber = (label: string) => {
  const explicit = label.match(/(?:match|partido)\s+(\d+)/i)

  if (explicit?.[1]) {
    return Number(explicit[1])
  }

  const compact = label.match(/^w(\d+)$/i)

  return compact?.[1] ? Number(compact[1]) : undefined
}

export class KnockoutBracketService {
  async getBracket() {
    await connectMongo()

    const [slots, matches, teams] = await Promise.all([
      KnockoutSlotModel.find({}).populate('teamId').sort({ stage: 1, matchNumber: 1, slot: 1 }).lean(),
      MatchModel.find({ stage: { $ne: 'group' } })
        .populate('homeTeamId')
        .populate('awayTeamId')
        .sort({ matchNumber: 1 })
        .lean(),
      TeamModel.find({ isActive: true }).sort({ name: 1 }).lean()
    ])

    return {
      slots: slots.map(serializeKnockoutSlot),
      matches: matches.map(serializeMatch),
      teams: teams.map(team => ({
        id: String(team._id),
        fifaCode: team.fifaCode,
        name: team.name,
        group: team.group || undefined
      }))
    }
  }

  async recalculate() {
    await connectMongo()

    const matches = await MatchModel.find({ stage: { $ne: 'group' } }).sort({ matchNumber: 1 })
    const bestThirds = await bestThirdsService.getBestThirds()
    let slotsUpdated = 0
    let matchesUpdated = 0

    for (const match of matches) {
      const seeds = parseSlotSeed(match)

      for (const seed of seeds) {
        const existing = await KnockoutSlotModel.findOne({ matchNumber: seed.matchNumber, slot: seed.slot })
        const resolvedTeamId = existing?.isManualOverride && existing.teamId
          ? existing.teamId
          : await this.resolveTeamId(seed, bestThirds)
        const slot = await KnockoutSlotModel.findOneAndUpdate(
          { matchNumber: seed.matchNumber, slot: seed.slot },
          {
            stage: seed.stage,
            matchNumber: seed.matchNumber,
            slot: seed.slot,
            sourceType: existing?.isManualOverride ? existing.sourceType : seed.sourceType,
            sourceLabel: existing?.isManualOverride ? existing.sourceLabel : seed.sourceLabel,
            teamId: resolvedTeamId,
            isManualOverride: existing?.isManualOverride || false,
            overrideReason: existing?.overrideReason
          },
          { upsert: true, returnDocument: 'after', runValidators: true }
        )

        await this.applySlotToMatch(slot.matchNumber, slot.slot, slot.teamId)
        slotsUpdated++
      }
    }

    matchesUpdated = slotsUpdated

    return {
      slotsUpdated,
      matchesUpdated
    }
  }

  async applyManualOverride(slotId: string, teamId: string, overrideReason: string) {
    await connectMongo()

    const team = await TeamModel.findById(teamId)

    if (!team) {
      throw new Error('Equipo no encontrado')
    }

    const slot = await KnockoutSlotModel.findByIdAndUpdate(
      slotId,
      {
        sourceType: 'manual',
        sourceLabel: 'Manual override',
        teamId,
        isManualOverride: true,
        overrideReason
      },
      { returnDocument: 'after', runValidators: true }
    )

    if (!slot) {
      throw new Error('Slot no encontrado')
    }

    await this.applySlotToMatch(slot.matchNumber, slot.slot, slot.teamId)

    return slot
  }

  private async resolveTeamId(seed: SlotSeed, bestThirds: Awaited<ReturnType<typeof bestThirdsService.getBestThirds>>) {
    if (seed.sourceType === 'group_winner' || seed.sourceType === 'group_runner_up') {
      const group = extractGroup(seed.sourceLabel)
      const position = seed.sourceType === 'group_winner' ? 1 : 2

      if (!group) {
        return undefined
      }

      const standing = await GroupStandingModel.findOne({ group, position })
      return standing?.teamId
    }

    if (seed.sourceType === 'best_third') {
      const ordinal = extractOrdinal(seed.sourceLabel) || 1
      const third = bestThirds.filter(row => row.qualifiedStatus === 'qualified_best_third')[ordinal - 1]
      return third?.teamId
    }

    if (seed.sourceType === 'match_winner') {
      const matchNumber = extractMatchNumber(seed.sourceLabel)

      if (!matchNumber) {
        return undefined
      }

      const sourceMatch = await MatchModel.findOne({ matchNumber })
      return this.getMatchWinnerTeamId(sourceMatch)
    }

    return undefined
  }

  private getMatchWinnerTeamId(match: Awaited<ReturnType<typeof MatchModel.findOne>>) {
    if (!match || match.status !== 'finished' || !match.finalWinner) {
      return undefined
    }

    const winner = match.finalWinner as MatchResultSide

    if (winner === 'home') {
      return match.homeTeamId
    }

    if (winner === 'away') {
      return match.awayTeamId
    }

    return undefined
  }

  private async applySlotToMatch(matchNumber: number, slot: string, teamId: unknown) {
    if (!teamId) {
      return
    }

    await MatchModel.updateOne(
      { matchNumber },
      { $set: slot === 'home' ? { homeTeamId: teamId } : { awayTeamId: teamId } },
      { runValidators: true }
    )
  }
}

export const knockoutBracketService = new KnockoutBracketService()
