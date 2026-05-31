import { bestThirdsService } from '../../../services/BestThirdsService'
import { requireAdminUser } from '../../../utils/auth'
import { createAuditLog } from '../../../utils/audit'
import { recalculateBestThirdsSchema } from '../../../validators/bestThirds'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const parsed = recalculateBestThirdsSchema.safeParse(await readBody(event).catch(() => undefined))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Override invalido',
      data: parsed.error.flatten()
    })
  }

  const result = await bestThirdsService.recalculate(parsed.data)

  await createAuditLog(event, {
    userId: admin.id,
    action: 'BEST_THIRDS_RECALCULATED',
    entity: 'BestThirds',
    after: {
      classified: result.classified,
      eliminated: result.eliminated,
      override: parsed.data?.override
    }
  })

  return {
    ok: true,
    ...result
  }
})
