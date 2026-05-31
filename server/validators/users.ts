import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'participant'])
export const userStatusSchema = z.enum(['active', 'inactive'])

export const userQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  role: z.union([userRoleSchema, z.literal('all')]).optional().default('all'),
  status: z.union([userStatusSchema, z.literal('all')]).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10)
})

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200),
  role: userRoleSchema,
  status: userStatusSchema.optional().default('active')
})

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().email().max(160),
  role: userRoleSchema,
  status: userStatusSchema
})

export const updateUserStatusSchema = z.object({
  status: userStatusSchema
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(200)
})
