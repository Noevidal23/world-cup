import mongoose from 'mongoose'
import { MatchModel } from '../../../models/Match'
import { requireAdminUser } from '../../../utils/auth'
import { createAuditLog } from '../../../utils/audit'
import { connectMongo } from '../../../utils/db'
import { serializeMatch } from '../../../utils/matches'
import { updateMatchSchema } from '../../../validators/matches'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Partido invalido'
    })
  }

  const parsed = updateMatchSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Datos invalidos',
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

  const unsetValues: Record<string, ''> = {}
  const setValues = {
    kickoffAt: new Date(parsed.data.kickoffAt),
    stadium: parsed.data.stadium || undefined,
    city: parsed.data.city || undefined,
    homeTeamId: parsed.data.homeTeamId || undefined,
    awayTeamId: parsed.data.awayTeamId || undefined,
    status: parsed.data.status,
    predictionsLocked: parsed.data.predictionsLocked,
    scoringMode: parsed.data.scoringMode
  }

  for (const [key, value] of Object.entries(setValues)) {
    if (value === undefined) {
      unsetValues[key] = ''
    }
  }

  const match = await MatchModel.findByIdAndUpdate(
    id,
    Object.keys(unsetValues).length > 0 ? { $set: setValues, $unset: unsetValues } : { $set: setValues },
    { returnDocument: 'after', runValidators: true }
  ).populate('homeTeamId').populate('awayTeamId')

  if (!match) {
    throw createError({
      statusCode: 404,
      message: 'Partido no encontrado'
    })
  }

  await createAuditLog(event, {
    userId: admin.id,
    action: 'MATCH_ADMIN_UPDATE',
    entity: 'Match',
    entityId: match._id,
    before,
    after: {
      matchNumber: match.matchNumber,
      fields: Object.keys(setValues)
    }
  })

  return {
    match: serializeMatch(match)
  }
})
