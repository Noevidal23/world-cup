import { importWorldCupSchedule } from '../../../../services/worldcupImport'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const result = await importWorldCupSchedule(await readBody(event), {
    actorId: admin.id,
    ipAddress: getRequestIP(event, { xForwardedFor: true }),
    userAgent: getHeader(event, 'user-agent'),
    source: 'api-preview',
    dryRun: true
  })

  return result
})
