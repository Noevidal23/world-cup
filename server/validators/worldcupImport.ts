import { z } from 'zod'

const stageSchema = z.enum(['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'])
const knockoutStageSchema = z.enum(['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'])

const teamRefSchema = z.string().trim().min(2).max(12)
const assetUrlSchema = z.string().trim().refine(value => value.startsWith('/') || z.url().safeParse(value).success, {
  message: 'Debe ser una URL absoluta o una ruta pública local'
})

const scoreConfigSchema = z.object({
  regulation: z.boolean().optional().default(true),
  extraTime: z.boolean().optional().default(false),
  penalties: z.boolean().optional().default(false)
}).optional()

const scoringModeSchema = z.enum(['regular_time', 'extra_time', 'penalties_final'])

export const worldCupImportSchema = z.object({
  tournament: z.string().trim().optional(),
  teams: z.array(z.object({
    fifaCode: z.string().trim().min(2).max(12),
    name: z.string().trim().min(2).max(120),
    group: z.string().trim().min(1).max(8).optional(),
    flagUrl: assetUrlSchema.optional()
  })).optional().default([]),
  groups: z.array(z.object({
    name: z.string().trim().min(1).max(8),
    teams: z.array(teamRefSchema).optional().default([])
  })).optional().default([]),
  venues: z.array(z.object({
    key: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(2).max(160),
    city: z.string().trim().min(2).max(120),
    country: z.string().trim().min(2).max(120).optional(),
    stadium: z.string().trim().min(2).max(160).optional()
  })).optional().default([]),
  knockoutSlots: z.array(z.object({
    slotKey: z.string().trim().min(2).max(80),
    stage: knockoutStageSchema,
    matchNumber: z.number().int().min(1).optional(),
    slot: z.enum(['home', 'away']).optional(),
    source: z.string().trim().min(2).max(160),
    team: teamRefSchema.optional(),
    notes: z.string().trim().max(400).optional()
  })).optional().default([]),
  matches: z.array(z.object({
    number: z.number().int().min(1),
    externalId: z.string().trim().min(1).max(80).optional(),
    stage: stageSchema,
    group: z.string().trim().min(1).max(8).optional(),
    kickoffAt: z.string().datetime({ offset: true }),
    venue: z.string().trim().min(1).max(160).optional(),
    venueKey: z.string().trim().min(1).max(80).optional(),
    stadium: z.string().trim().min(1).max(160).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    country: z.string().trim().min(1).max(120).optional(),
    homeTeam: teamRefSchema.optional(),
    awayTeam: teamRefSchema.optional(),
    homeSlot: z.string().trim().min(2).max(80).optional(),
    awaySlot: z.string().trim().min(2).max(80).optional(),
    scoringMode: scoringModeSchema.optional(),
    scoreConfig: scoreConfigSchema
  })).min(1)
})

export type WorldCupImportInput = z.infer<typeof worldCupImportSchema>
