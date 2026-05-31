import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { importWorldCupSchedule } from '../../../services/worldcupImport'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const filePath = resolve(process.cwd(), 'data/worldcup-2026.json')
  const file = await readFile(filePath, 'utf8')
  const payload = JSON.parse(file)

  return await importWorldCupSchedule(payload, {
    actorId: admin.id,
    ipAddress: getRequestIP(event, { xForwardedFor: true }),
    userAgent: getHeader(event, 'user-agent'),
    source: 'admin:local-json'
  })
})
