import { GroupStandingModel } from '../../../models/GroupStanding'
import { KnockoutSlotModel } from '../../../models/KnockoutSlot'
import { MatchModel } from '../../../models/Match'
import { PredictionModel } from '../../../models/Prediction'
import { predictionLockService } from '../../../services/PredictionLockService'
import { requireAdminUser } from '../../../utils/auth'
import { connectMongo } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  await connectMongo()
  await predictionLockService.lockStartedMatches({ source: 'tournament-health' })

  const now = new Date()
  const [
    overdueResults,
    knockoutMatchesWithoutTeams,
    pendingSlots,
    unlockedStartedMatches,
    predictionsOnMissingMatches,
    groupsWithoutStandings
  ] = await Promise.all([
    MatchModel.countDocuments({ status: { $ne: 'finished' }, kickoffAt: { $lte: now } }),
    MatchModel.countDocuments({
      stage: { $ne: 'group' },
      $or: [
        { homeTeamId: { $exists: false } },
        { awayTeamId: { $exists: false } }
      ]
    }),
    KnockoutSlotModel.countDocuments({ teamId: { $exists: false }, isManualOverride: false }),
    MatchModel.countDocuments({ kickoffAt: { $lte: now }, predictionsLocked: false, status: { $ne: 'cancelled' } }),
    PredictionModel.aggregate<{ count: number }>([
      {
        $lookup: {
          from: MatchModel.collection.name,
          localField: 'matchId',
          foreignField: '_id',
          as: 'match'
        }
      },
      { $match: { match: { $size: 0 } } },
      { $count: 'count' }
    ]),
    GroupStandingModel.aggregate<{ _id: string, standings: number }>([
      { $group: { _id: '$group', standings: { $sum: 1 } } },
      { $match: { standings: { $lt: 4 } } }
    ])
  ])

  const issues = [
    { key: 'overdueResults', label: 'Partidos sin resultado', count: overdueResults },
    { key: 'knockoutMatchesWithoutTeams', label: 'Partidos eliminatorios sin equipos', count: knockoutMatchesWithoutTeams },
    { key: 'pendingSlots', label: 'Slots de clasificados pendientes', count: pendingSlots },
    { key: 'unlockedStartedMatches', label: 'Partidos iniciados con pronósticos abiertos', count: unlockedStartedMatches },
    { key: 'predictionsOnMissingMatches', label: 'Pronósticos con partido inexistente', count: predictionsOnMissingMatches[0]?.count || 0 },
    { key: 'groupsWithoutStandings', label: 'Grupos con tablas incompletas', count: groupsWithoutStandings.length }
  ]

  return {
    ok: issues.every(issue => issue.count === 0),
    issues
  }
})
