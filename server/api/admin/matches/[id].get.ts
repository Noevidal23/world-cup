import mongoose from 'mongoose'
import { MatchModel } from '../../../models/Match'
import { requireAdminUser } from '../../../utils/auth'
import { connectMongo } from '../../../utils/db'
import { serializeMatch } from '../../../utils/matches'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Partido invalido'
    })
  }

  await connectMongo()
  const match = await MatchModel.findById(id).populate('homeTeamId').populate('awayTeamId')

  if (!match) {
    throw createError({
      statusCode: 404,
      message: 'Partido no encontrado'
    })
  }

  return {
    match: serializeMatch(match)
  }
})
