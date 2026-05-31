import { z } from 'zod'

export const auditQuerySchema = z.object({
  userId: z.string().trim().optional().default('all'),
  action: z.string().trim().max(120).optional().default('all'),
  entity: z.string().trim().max(120).optional().default('all'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
})
