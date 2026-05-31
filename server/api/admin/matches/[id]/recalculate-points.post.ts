import mongoose from 'mongoose'
import { MatchModel } from '../../../../models/Match'
import { predictionScoreService } from '../../../../services/PredictionScoreService'
import { requireAdminUser } from '../../../../utils/auth'
import { createAuditLog } from '../../../../utils/audit'
import { connectMongo } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Partido invalido'
    })
  }

  await connectMongo()

  const match = await MatchModel.findById(id)

  if (!match) {
    throw createError({
      statusCode: 404,
      message: 'Partido no encontrado'
    })
  }

  let result

  try {
    result = await predictionScoreService.evaluateMatchPredictions(id)
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'No se pudo recalcular el partido'
    })
  }

  await createAuditLog(event, {
    userId: admin.id,
    action: 'MATCH_POINTS_RECALCULATED',
    entity: 'Match',
    entityId: match._id,
    after: {
      matchNumber: match.matchNumber,
      evaluated: result.evaluated,
      rankingsUpdated: result.rankingsUpdated
    }
  })

  return {
    ok: true,
    ...result
  }
})
