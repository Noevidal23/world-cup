import mongoose from 'mongoose'
import { MatchModel } from '../../../../models/Match'
import { bestThirdsService } from '../../../../services/BestThirdsService'
import { groupStandingService } from '../../../../services/GroupStandingService'
import { knockoutBracketService } from '../../../../services/KnockoutBracketService'
import { predictionScoreService } from '../../../../services/PredictionScoreService'
import { requireAdminUser } from '../../../../utils/auth'
import { createAuditLog } from '../../../../utils/audit'
import { connectMongo } from '../../../../utils/db'
import { serializeMatch } from '../../../../utils/matches'
import { calculateFinalWinner, calculateResultSide } from '../../../../utils/results'
import { finalResultSchema } from '../../../../validators/matches'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Partido invalido'
    })
  }

  const parsed = finalResultSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Resultado final invalido',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  const existing = await MatchModel.findById(id)

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Partido no encontrado'
    })
  }
  await existing.populate('homeTeamId')
  await existing.populate('awayTeamId')
  const before = serializeMatch(existing)
  const auditAction = existing.status === 'finished' ? 'MATCH_FINAL_RESULT_EDITED' : 'MATCH_FINAL_RESULT_CAPTURED'

  const requiresExtraTime = existing.scoringMode === 'extra_time' || existing.scoringMode === 'penalties_final'
  const requiresPenalties = existing.scoringMode === 'penalties_final'

  if (requiresExtraTime && (parsed.data.extraTimeHomeGoals === undefined || parsed.data.extraTimeHomeGoals === null || parsed.data.extraTimeAwayGoals === undefined || parsed.data.extraTimeAwayGoals === null)) {
    throw createError({
      statusCode: 400,
      message: 'El marcador de tiempos extra es obligatorio para este modo'
    })
  }

  if (requiresPenalties && (parsed.data.penaltyHomeGoals === undefined || parsed.data.penaltyHomeGoals === null || parsed.data.penaltyAwayGoals === undefined || parsed.data.penaltyAwayGoals === null || !parsed.data.penaltyWinner)) {
    throw createError({
      statusCode: 400,
      message: 'El resultado de penales es obligatorio para este modo'
    })
  }

  const regularResult = calculateResultSide(parsed.data.regularHomeGoals, parsed.data.regularAwayGoals)
  const extraTimeResult = requiresExtraTime
    ? calculateResultSide(parsed.data.extraTimeHomeGoals as number, parsed.data.extraTimeAwayGoals as number)
    : undefined
  const finalWinner = calculateFinalWinner({
    scoringMode: existing.scoringMode,
    regularResult,
    extraTimeResult,
    penaltyWinner: parsed.data.penaltyWinner || undefined
  })
  const unsetValues: Record<string, ''> = {}

  if (!requiresExtraTime) {
    unsetValues.extraTimeHomeGoals = ''
    unsetValues.extraTimeAwayGoals = ''
    unsetValues.extraTimeResult = ''
  }

  if (!requiresPenalties) {
    unsetValues.penaltyHomeGoals = ''
    unsetValues.penaltyAwayGoals = ''
    unsetValues.penaltyWinner = ''
  }

  const match = await MatchModel.findByIdAndUpdate(id, {
    $set: {
      regularHomeGoals: parsed.data.regularHomeGoals,
      regularAwayGoals: parsed.data.regularAwayGoals,
      regularResult,
      extraTimeHomeGoals: requiresExtraTime ? parsed.data.extraTimeHomeGoals : undefined,
      extraTimeAwayGoals: requiresExtraTime ? parsed.data.extraTimeAwayGoals : undefined,
      extraTimeResult,
      penaltyHomeGoals: requiresPenalties ? parsed.data.penaltyHomeGoals : undefined,
      penaltyAwayGoals: requiresPenalties ? parsed.data.penaltyAwayGoals : undefined,
      penaltyWinner: requiresPenalties ? parsed.data.penaltyWinner : undefined,
      finalWinner,
      status: 'finished',
      predictionsLocked: true
    },
    ...(Object.keys(unsetValues).length > 0 ? { $unset: unsetValues } : {})
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
    action: auditAction,
    entity: 'Match',
    entityId: match._id,
    before,
    after: {
      matchNumber: match.matchNumber,
      scoringMode: match.scoringMode,
      regularHomeGoals: match.regularHomeGoals,
      regularAwayGoals: match.regularAwayGoals,
      extraTimeHomeGoals: match.extraTimeHomeGoals,
      extraTimeAwayGoals: match.extraTimeAwayGoals,
      penaltyHomeGoals: match.penaltyHomeGoals,
      penaltyAwayGoals: match.penaltyAwayGoals,
      penaltyWinner: match.penaltyWinner,
      finalWinner: match.finalWinner
    }
  })

  const scoring = await predictionScoreService.evaluateMatchPredictions(id)
  const groupStandings = match.stage === 'group' ? await groupStandingService.recalculate() : undefined
  const bestThirds = match.stage === 'group' ? await bestThirdsService.recalculate() : undefined
  const bracket = match.stage !== 'group' ? await knockoutBracketService.recalculate() : undefined

  return {
    match: serializeMatch(match),
    scoring,
    groupStandings,
    bestThirds,
    bracket
  }
})
