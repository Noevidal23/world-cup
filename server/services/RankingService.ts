import type { Types } from 'mongoose'
import { PredictionModel } from '../models/Prediction'
import { UserModel } from '../models/User'
import { UserRankingModel } from '../models/UserRanking'
import { connectMongo } from '../utils/db'
import type { RankingRow } from '../../types/domain'

interface RankingAggregate {
  _id: Types.ObjectId
  totalPoints: number
  predictionsSubmitted: number
  predictionsEvaluated: number
  winnerPoints: number
  exactScorePoints: number
  possiblePoints: number
  lastPredictionAt?: Date
}

interface RankingDocumentAggregate {
  id: string
  position: number
  participant: {
    id: string
    name: string
    username: string
  }
  totalPoints: number
  predictionsSubmitted: number
  winnerPoints: number
  exactScorePoints: number
  effectivenessPercentage: number
  lastPredictionAt?: Date
}

export class RankingService {
  async recalculateAll() {
    await connectMongo()

    const grouped = await PredictionModel.aggregate<RankingAggregate>([
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$totalPoints' },
          predictionsSubmitted: { $sum: 1 },
          predictionsEvaluated: {
            $sum: {
              $cond: [{ $eq: ['$status', 'evaluated'] }, 1, 0]
            }
          },
          winnerPoints: { $sum: '$pointsWinner' },
          exactScorePoints: { $sum: '$pointsExactScore' },
          possiblePoints: {
            $sum: {
              $cond: [{ $eq: ['$status', 'evaluated'] }, { $ifNull: ['$possiblePoints', 2] }, 0]
            }
          },
          lastPredictionAt: { $max: '$updatedAt' }
        }
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.role': 'participant',
          'user.status': 'active'
        }
      },
      {
        $sort: {
          totalPoints: -1,
          exactScorePoints: -1,
          winnerPoints: -1,
          predictionsSubmitted: -1,
          lastPredictionAt: 1
        }
      }
    ])

    const rankedUserIds = grouped.map(item => item._id)
    const deleteFilter = (rankedUserIds.length > 0 ? { userId: { $nin: rankedUserIds } } : {}) as Parameters<typeof UserRankingModel.deleteMany>[0]

    await UserRankingModel.deleteMany(deleteFilter)

    for (const [index, item] of grouped.entries()) {
      const effectivenessPercentage = item.predictionsEvaluated > 0
        ? Math.round((item.totalPoints / Math.max(item.possiblePoints, 1)) * 10000) / 100
        : 0

      await UserRankingModel.findOneAndUpdate(
        { userId: item._id },
        {
          userId: item._id,
          totalPoints: item.totalPoints,
          predictionsSubmitted: item.predictionsSubmitted,
          predictionsEvaluated: item.predictionsEvaluated,
          winnerPoints: item.winnerPoints,
          exactScorePoints: item.exactScorePoints,
          effectivenessPercentage,
          lastPredictionAt: item.lastPredictionAt,
          rank: index + 1
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
      )
    }

    return {
      rankingsUpdated: grouped.length
    }
  }

  async getRanking() {
    await this.recalculateAll()

    const ranking = await UserRankingModel.aggregate<RankingDocumentAggregate>([
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.role': 'participant',
          'user.status': 'active'
        }
      },
      { $sort: { rank: 1 } },
      {
        $project: {
          id: { $toString: '$_id' },
          position: '$rank',
          participant: {
            id: { $toString: '$user._id' },
            name: '$user.name',
            username: '$user.username'
          },
          totalPoints: 1,
          predictionsSubmitted: 1,
          winnerPoints: 1,
          exactScorePoints: 1,
          effectivenessPercentage: 1,
          lastPredictionAt: 1
        }
      }
    ])

    return ranking.map((row): RankingRow => ({
      ...row,
      lastPredictionAt: row.lastPredictionAt ? new Date(row.lastPredictionAt).toISOString() : undefined
    }))
  }
}

export const rankingService = new RankingService()
