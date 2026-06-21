import { z } from 'zod'

export const userPicksQuerySchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i).optional()
})
