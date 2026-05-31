import { bestThirdsService } from '../../../services/BestThirdsService'
import { groupStandingService } from '../../../services/GroupStandingService'
import { knockoutBracketService } from '../../../services/KnockoutBracketService'
import { predictionScoreService } from '../../../services/PredictionScoreService'
import { requireAdminUser } from '../../../utils/auth'
import { createAuditLog } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const ranking = await predictionScoreService.recalculateAll()
  const groups = await groupStandingService.recalculate()
  const bestThirds = await bestThirdsService.recalculate()
  const bracket = await knockoutBracketService.recalculate()

  await createAuditLog(event, {
    userId: admin.id,
    action: 'TOURNAMENT_GLOBAL_RECALCULATED',
    entity: 'Tournament',
    after: {
      ranking,
      groups,
      bestThirds: {
        classified: bestThirds.classified,
        eliminated: bestThirds.eliminated
      },
      bracket
    }
  })

  return {
    ok: true,
    ranking,
    groups,
    bestThirds,
    bracket
  }
})
