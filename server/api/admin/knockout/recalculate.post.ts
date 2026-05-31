import { knockoutBracketService } from '../../../services/KnockoutBracketService'
import { requireAdminUser } from '../../../utils/auth'
import { createAuditLog } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const result = await knockoutBracketService.recalculate()

  await createAuditLog(event, {
    userId: admin.id,
    action: 'KNOCKOUT_BRACKET_RECALCULATED',
    entity: 'KnockoutSlot',
    after: result
  })

  return {
    ok: true,
    ...result
  }
})
