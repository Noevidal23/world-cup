import mongoose from 'mongoose'
import { MatchModel } from '../../../../models/Match'
import { requireAdminUser } from '../../../../utils/auth'
import { createAuditLog } from '../../../../utils/audit'
import { connectMongo } from '../../../../utils/db'
import { serializeMatch } from '../../../../utils/matches'
import { partialResultSchema } from '../../../../validators/matches'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Partido invalido'
    })
  }

  const parsed = partialResultSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Resultado parcial invalido',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  const existing = await MatchModel.findById(id).populate('homeTeamId').populate('awayTeamId')

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Partido no encontrado'
    })
  }

  const before = serializeMatch(existing)
  const match = await MatchModel.findByIdAndUpdate(id, {
    $set: {
      partialHomeGoals: parsed.data.partialHomeGoals,
      partialAwayGoals: parsed.data.partialAwayGoals,
      partialMinute: parsed.data.partialMinute ?? undefined,
      partialStatusText: parsed.data.partialStatusText || undefined
    }
  }, {
    returnDocument: 'after',
    runValidators: true
  }).populate('homeTeamId').populate('awayTeamId')

  if (!match) {
    throw createError({
      statusCode: 404,
      message: 'Partido no encontrado'
    })
  }

  await createAuditLog(event, {
    userId: admin.id,
    action: 'MATCH_PARTIAL_RESULT_UPDATE',
    entity: 'Match',
    entityId: match._id,
    before,
    after: {
      matchNumber: match.matchNumber,
      partialHomeGoals: match.partialHomeGoals,
      partialAwayGoals: match.partialAwayGoals,
      partialMinute: match.partialMinute,
      partialStatusText: match.partialStatusText
    }
  })

  return {
    match: serializeMatch(match)
  }
})
