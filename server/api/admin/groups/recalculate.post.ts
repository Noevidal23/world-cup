import { bestThirdsService } from '../../../services/BestThirdsService'
import { groupStandingService } from '../../../services/GroupStandingService'
import { requireAdminUser } from '../../../utils/auth'
import { createAuditLog } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const result = await groupStandingService.recalculate()
  const bestThirds = await bestThirdsService.recalculate()

  await createAuditLog(event, {
    userId: admin.id,
    action: 'GROUP_STANDINGS_RECALCULATED',
    entity: 'GroupStanding',
    after: {
      ...result,
      bestThirds: {
        classified: bestThirds.classified,
        eliminated: bestThirds.eliminated
      }
    }
  })

  return {
    ok: true,
    ...result,
    bestThirds: {
      classified: bestThirds.classified,
      eliminated: bestThirds.eliminated
    }
  }
})
