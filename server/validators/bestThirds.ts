import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i)

export const bestThirdOverrideSchema = z.object({
  teamId: objectIdSchema,
  qualifiedStatus: z.enum(['qualified_best_third', 'possible_best_third', 'eliminated']).optional(),
  sortOrder: z.number().int().min(1).max(12).optional().nullable(),
  justification: z.string().trim().min(5).max(500)
})

export const recalculateBestThirdsSchema = z.object({
  override: bestThirdOverrideSchema.optional()
}).optional()
