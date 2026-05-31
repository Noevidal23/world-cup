import type { Types } from 'mongoose'
import { AuditLogModel } from '../models/AuditLog'
import { KnockoutSlotModel } from '../models/KnockoutSlot'
import { MatchModel } from '../models/Match'
import { TeamModel } from '../models/Team'
import { connectMongo } from '../utils/db'
import { worldCupImportSchema, type WorldCupImportInput } from '../validators/worldcupImport'

interface ImportOptions {
  actorId?: string
  ipAddress?: string
  userAgent?: string
  source?: string
  dryRun?: boolean
  connect?: () => Promise<unknown>
}

interface ImportCounters {
  teamsCreated: number
  teamsUpdated: number
  matchesCreated: number
  matchesUpdated: number
  slotsCreated: number
  slotsUpdated: number
}

const createCounters = (): ImportCounters => ({
  teamsCreated: 0,
  teamsUpdated: 0,
  matchesCreated: 0,
  matchesUpdated: 0,
  slotsCreated: 0,
  slotsUpdated: 0
})

const normalizeCode = (value: string) => value.trim().toUpperCase()

const defaultScoringModeForStage = (stage: WorldCupImportInput['matches'][number]['stage']) =>
  stage === 'group' ? 'regular_time' : 'penalties_final'

const resolveScoringMode = (match: WorldCupImportInput['matches'][number]) => {
  if (match.scoringMode) {
    return match.scoringMode
  }

  if (match.scoreConfig?.penalties) {
    return 'penalties_final'
  }

  if (match.scoreConfig?.extraTime) {
    return 'extra_time'
  }

  return defaultScoringModeForStage(match.stage)
}

const resolveVenue = (input: WorldCupImportInput) => {
  const venuesByKey = new Map<string, WorldCupImportInput['venues'][number]>()

  for (const venue of input.venues) {
    if (venue.key) {
      venuesByKey.set(venue.key, venue)
    }

    venuesByKey.set(venue.name, venue)
  }

  return venuesByKey
}

const upsertTeam = async (
  fifaCode: string,
  values: { name?: string, group?: string, flagUrl?: string },
  counters: ImportCounters
) => {
  const code = normalizeCode(fifaCode)
  const existing = await TeamModel.findOne({ fifaCode: code })

  if (existing) {
    existing.name = values.name || existing.name
    existing.group = values.group || existing.group
    existing.flagUrl = values.flagUrl || existing.flagUrl
    await existing.save()
    counters.teamsUpdated++
    return existing
  }

  const created = await TeamModel.create({
    fifaCode: code,
    name: values.name || code,
    group: values.group,
    flagUrl: values.flagUrl
  })

  counters.teamsCreated++
  return created
}

const upsertSlot = async (
  values: {
    slotKey: string
    stage: Exclude<WorldCupImportInput['matches'][number]['stage'], 'group'>
    source: string
    team?: Types.ObjectId
    notes?: string
    matchNumber?: number
    slot?: 'home' | 'away'
  },
  counters: ImportCounters
) => {
  const matchNumber = values.matchNumber || 0
  const slotSide = values.slot || 'home'
  const existing = await KnockoutSlotModel.findOne({ matchNumber, slot: slotSide })

  if (existing) {
    existing.stage = values.stage
    existing.sourceLabel = values.source
    existing.teamId = values.team || existing.teamId
    await existing.save()
    counters.slotsUpdated++
    return existing
  }

  const created = await KnockoutSlotModel.create({
    stage: values.stage,
    matchNumber,
    slot: slotSide,
    sourceType: 'manual',
    sourceLabel: values.source,
    teamId: values.team,
    isManualOverride: false,
    overrideReason: values.notes
  })
  counters.slotsCreated++
  return created
}

export const importWorldCupSchedule = async (payload: unknown, options: ImportOptions = {}) => {
  const input = worldCupImportSchema.parse(payload)
  const counters = createCounters()

  await (options.connect || connectMongo)()

  if (options.dryRun) {
    const teamCodes = new Set(input.teams.map(team => normalizeCode(team.fifaCode)))

    for (const group of input.groups) {
      for (const teamCode of group.teams) {
        teamCodes.add(normalizeCode(teamCode))
      }
    }

    for (const match of input.matches) {
      if (match.homeTeam) {
        teamCodes.add(normalizeCode(match.homeTeam))
      }

      if (match.awayTeam) {
        teamCodes.add(normalizeCode(match.awayTeam))
      }
    }

    for (const code of teamCodes) {
      const exists = await TeamModel.exists({ fifaCode: code })
      counters[exists ? 'teamsUpdated' : 'teamsCreated']++
    }

    for (const match of input.matches) {
      const externalId = match.externalId || `match-${match.number}`
      const exists = await MatchModel.exists({
        $or: [
          { externalId },
          { matchNumber: match.number }
        ]
      })

      counters[exists ? 'matchesUpdated' : 'matchesCreated']++
    }

    const slots = [
      ...input.knockoutSlots
        .filter(slot => slot.matchNumber && slot.slot)
        .map(slot => ({ matchNumber: slot.matchNumber as number, slot: slot.slot as 'home' | 'away' })),
      ...input.matches
        .filter(match => match.stage !== 'group' && match.homeSlot)
        .map(match => ({ matchNumber: match.number, slot: 'home' as const })),
      ...input.matches
        .filter(match => match.stage !== 'group' && match.awaySlot)
        .map(match => ({ matchNumber: match.number, slot: 'away' as const }))
    ]

    for (const slot of slots) {
      const exists = await KnockoutSlotModel.exists(slot)
      counters[exists ? 'slotsUpdated' : 'slotsCreated']++
    }

    return {
      ok: true,
      dryRun: true,
      counters
    }
  }

  const teamsByCode = new Map<string, Awaited<ReturnType<typeof upsertTeam>>>()
  const groupByTeam = new Map<string, string>()

  for (const group of input.groups) {
    for (const teamCode of group.teams) {
      groupByTeam.set(normalizeCode(teamCode), group.name)
    }
  }

  for (const team of input.teams) {
    const code = normalizeCode(team.fifaCode)
    const saved = await upsertTeam(code, {
      name: team.name,
      group: team.group || groupByTeam.get(code),
      flagUrl: team.flagUrl
    }, counters)

    teamsByCode.set(code, saved)
  }

  for (const [code, group] of groupByTeam) {
    if (!teamsByCode.has(code)) {
      const saved = await upsertTeam(code, { group }, counters)
      teamsByCode.set(code, saved)
    }
  }

  const getTeam = async (code?: string) => {
    if (!code) {
      return undefined
    }

    const normalized = normalizeCode(code)
    const existing = teamsByCode.get(normalized)

    if (existing) {
      return existing
    }

    const saved = await upsertTeam(normalized, {}, counters)
    teamsByCode.set(normalized, saved)
    return saved
  }

  for (const slot of input.knockoutSlots) {
    if (!slot.matchNumber || !slot.slot) {
      continue
    }

    const team = await getTeam(slot.team)
    await upsertSlot({
      slotKey: slot.slotKey,
      stage: slot.stage,
      source: slot.source,
      team: team?._id,
      notes: slot.notes,
      matchNumber: slot.matchNumber,
      slot: slot.slot
    }, counters)
  }

  const venuesByKey = resolveVenue(input)

  for (const match of input.matches) {
    const externalId = match.externalId || `match-${match.number}`
    const venue = match.venueKey ? venuesByKey.get(match.venueKey) : match.venue ? venuesByKey.get(match.venue) : undefined
    const homeTeam = await getTeam(match.homeTeam)
    const awayTeam = await getTeam(match.awayTeam)
    const scoringMode = resolveScoringMode(match)

    if (match.stage !== 'group') {
      if (match.homeSlot) {
        await upsertSlot({
          slotKey: match.homeSlot,
          stage: match.stage,
          source: match.homeSlot,
          matchNumber: match.number,
          slot: 'home'
        }, counters)
      }

      if (match.awaySlot) {
        await upsertSlot({
          slotKey: match.awaySlot,
          stage: match.stage,
          source: match.awaySlot,
          matchNumber: match.number,
          slot: 'away'
        }, counters)
      }
    }

    const values = {
      externalId,
      matchNumber: match.number,
      stage: match.stage,
      group: match.group,
      homeTeamId: homeTeam?._id,
      awayTeamId: awayTeam?._id,
      homeSlotLabel: match.homeSlot,
      awaySlotLabel: match.awaySlot,
      kickoffAt: new Date(match.kickoffAt),
      stadium: match.stadium || venue?.stadium || match.venue || venue?.name,
      city: match.city || venue?.city,
      scoringMode
    }
    const unsetValues: Record<string, ''> = {}

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        unsetValues[key] = ''
      }
    }

    const existing = await MatchModel.findOne({
      $or: [
        { externalId },
        { matchNumber: match.number }
      ]
    })

    if (existing) {
      await MatchModel.updateOne(
        { _id: existing._id },
        Object.keys(unsetValues).length > 0 ? { $set: values, $unset: unsetValues } : { $set: values },
        { runValidators: true }
      )
      counters.matchesUpdated++
    } else {
      await MatchModel.create(values)
      counters.matchesCreated++
    }
  }

  await AuditLogModel.create({
    userId: options.actorId,
    actor: options.actorId,
    action: 'WORLD_CUP_IMPORT',
    entity: 'WorldCupSchedule',
    entityType: 'WorldCupSchedule',
    after: {
      source: options.source || 'unknown',
      tournament: input.tournament,
      counters
    },
    metadata: {
      source: options.source || 'unknown',
      tournament: input.tournament,
      counters
    },
    ip: options.ipAddress,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent
  })

  return {
    ok: true,
    counters
  }
}
