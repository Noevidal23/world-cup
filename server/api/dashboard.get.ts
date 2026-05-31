import { AuditLogModel } from '../models/AuditLog'
import { GroupStandingModel } from '../models/GroupStanding'
import { KnockoutSlotModel } from '../models/KnockoutSlot'
import { MatchModel } from '../models/Match'
import { PredictionModel } from '../models/Prediction'
import { UserModel } from '../models/User'
import { UserRankingModel } from '../models/UserRanking'
import { predictionLockService } from '../services/PredictionLockService'
import { rankingService } from '../services/RankingService'
import { requireSessionUser } from '../utils/auth'
import { connectMongo } from '../utils/db'
import { serializeMatch } from '../utils/matches'

const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfToday = () => {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

const matchQuery = () => MatchModel.find()
  .populate('homeTeamId')
  .populate('awayTeamId')

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)

  await connectMongo()
  await predictionLockService.lockStartedMatches({ source: 'dashboard' })
  await rankingService.recalculateAll()

  const now = new Date()
  const todayStart = startOfToday()
  const todayEnd = endOfToday()

  if (user.role === 'admin') {
    const [
      todayMatches,
      pendingResultMatches,
      predictionsCaptured,
      activeUsers,
      groupStats,
      matchesWithoutResult,
      matchesWithoutTeams,
      pendingClassifiers,
      modifiedResults
    ] = await Promise.all([
      matchQuery()
        .find({ kickoffAt: { $gte: todayStart, $lte: todayEnd } })
        .sort({ kickoffAt: 1 })
        .limit(8),
      matchQuery()
        .find({ status: { $in: ['scheduled', 'live'] }, kickoffAt: { $lte: now } })
        .sort({ kickoffAt: 1 })
        .limit(8),
      PredictionModel.countDocuments(),
      UserModel.countDocuments({ status: 'active' }),
      GroupStandingModel.aggregate<{
        _id: string
        teams: number
        directQualified: number
        bestThirdQualified: number
        eliminated: number
      }>([
        {
          $group: {
            _id: '$group',
            teams: { $sum: 1 },
            directQualified: {
              $sum: { $cond: [{ $eq: ['$qualifiedStatus', 'qualified_direct'] }, 1, 0] }
            },
            bestThirdQualified: {
              $sum: { $cond: [{ $eq: ['$qualifiedStatus', 'qualified_best_third'] }, 1, 0] }
            },
            eliminated: {
              $sum: { $cond: [{ $eq: ['$qualifiedStatus', 'eliminated'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      MatchModel.countDocuments({ status: { $ne: 'finished' }, kickoffAt: { $lte: now } }),
      MatchModel.countDocuments({
        stage: { $ne: 'group' },
        $or: [
          { homeTeamId: { $exists: false } },
          { awayTeamId: { $exists: false } }
        ]
      }),
      KnockoutSlotModel.countDocuments({
        teamId: { $exists: false },
        isManualOverride: false
      }),
      AuditLogModel.countDocuments({ action: 'MATCH_FINAL_RESULT_EDITED' })
    ])

    return {
      role: 'admin',
      todayMatches: todayMatches.map(serializeMatch),
      pendingResultMatches: pendingResultMatches.map(serializeMatch),
      metrics: {
        predictionsCaptured,
        activeUsers,
        groupsCalculated: groupStats.length,
        groupsCompleted: groupStats.filter(group => group.directQualified >= 2).length
      },
      groupStatus: groupStats.map(group => ({
        group: group._id,
        teams: group.teams,
        qualified: group.directQualified + group.bestThirdQualified,
        eliminated: group.eliminated
      })),
      alerts: {
        matchesWithoutResult,
        matchesWithoutTeams,
        pendingClassifiers,
        modifiedResults
      }
    }
  }

  const [upcomingMatches, userPredictions, ranking, lastResults] = await Promise.all([
    matchQuery()
      .find({ kickoffAt: { $gt: now }, status: { $ne: 'cancelled' } })
      .sort({ kickoffAt: 1 })
      .limit(5),
    PredictionModel.find({ userId: user.id }).select('matchId status totalPoints pointsWinner pointsExactScore updatedAt'),
    UserRankingModel.findOne({ userId: user.id }),
    matchQuery()
      .where('status').equals('finished')
      .sort({ kickoffAt: -1 })
      .limit(5)
  ])
  const predictedMatchIds = new Set(userPredictions.map(prediction => String(prediction.matchId)))
  const pendingPredictions = await matchQuery()
    .find({
      _id: { $nin: [...predictedMatchIds] },
      kickoffAt: { $gt: now },
      predictionsLocked: false,
      status: { $ne: 'cancelled' }
    })
    .sort({ kickoffAt: 1 })
    .limit(5)

  return {
    role: 'participant',
    upcomingMatches: upcomingMatches.map(serializeMatch),
    pendingPredictions: pendingPredictions.map(serializeMatch),
    ranking: ranking
      ? {
          totalPoints: ranking.totalPoints,
          rank: ranking.rank,
          predictionsSubmitted: ranking.predictionsSubmitted,
          effectivenessPercentage: ranking.effectivenessPercentage
        }
      : {
          totalPoints: 0,
          rank: 0,
          predictionsSubmitted: userPredictions.length,
          effectivenessPercentage: 0
        },
    lastResults: lastResults.map(serializeMatch)
  }
})
