import { z } from 'zod'

export const matchStageSchema = z.enum(['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'])
export const matchStatusSchema = z.enum(['scheduled', 'live', 'finished', 'cancelled'])
export const scoringModeSchema = z.enum(['regular_time', 'extra_time', 'penalties_final'])

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i)

export const matchQuerySchema = z.object({
  group: z.string().trim().optional().default('all'),
  stage: z.union([matchStageSchema, z.literal('all')]).optional().default('all'),
  status: z.union([matchStatusSchema, z.literal('all')]).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
})

export const updateMatchSchema = z.object({
  kickoffAt: z.string().datetime({ offset: true }),
  stadium: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  homeTeamId: objectIdSchema.optional().nullable(),
  awayTeamId: objectIdSchema.optional().nullable(),
  status: matchStatusSchema,
  scoringMode: scoringModeSchema
})

export const partialResultSchema = z.object({
  partialHomeGoals: z.number().int().min(0).max(99),
  partialAwayGoals: z.number().int().min(0).max(99),
  partialMinute: z.number().int().min(0).max(130).optional().nullable(),
  partialStatusText: z.string().trim().max(120).optional().nullable()
})

export const finalResultSchema = z.object({
  regularHomeGoals: z.number().int().min(0).max(99),
  regularAwayGoals: z.number().int().min(0).max(99),
  extraTimeHomeGoals: z.number().int().min(0).max(99).optional().nullable(),
  extraTimeAwayGoals: z.number().int().min(0).max(99).optional().nullable(),
  penaltyHomeGoals: z.number().int().min(0).max(99).optional().nullable(),
  penaltyAwayGoals: z.number().int().min(0).max(99).optional().nullable(),
  penaltyWinner: z.enum(['home', 'away']).optional().nullable()
})
