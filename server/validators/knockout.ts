import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i)

export const manualKnockoutOverrideSchema = z.object({
  teamId: objectIdSchema,
  overrideReason: z.string().trim().min(5).max(500)
})
