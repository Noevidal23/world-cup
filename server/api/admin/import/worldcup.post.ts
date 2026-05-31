import { requireAdminUser } from '../../../utils/auth'
import { importWorldCupSchedule } from '../../../services/worldcupImport'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const body = await readBody(event)

  try {
    return await importWorldCupSchedule(body, {
      actorId: admin.id,
      source: 'api',
      ipAddress: getRequestIP(event, { xForwardedFor: true }),
      userAgent: getHeader(event, 'user-agent')
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        message: 'JSON invalido',
        data: error
      })
    }

    throw error
  }
})
