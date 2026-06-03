import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i)

export const predictionInputSchema = z.object({
  matchId: objectIdSchema,
  predictedHomeGoals: z.number().int().min(0).max(99),
  predictedAwayGoals: z.number().int().min(0).max(99),
  predictedExtraTimeHomeGoals: z.number().int().min(0).max(99).optional(),
  predictedExtraTimeAwayGoals: z.number().int().min(0).max(99).optional(),
  predictedPenaltyHomeGoals: z.number().int().min(0).max(99).optional(),
  predictedPenaltyAwayGoals: z.number().int().min(0).max(99).optional()
})
