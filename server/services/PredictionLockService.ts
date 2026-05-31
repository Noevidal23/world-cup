import { AuditLogModel } from '../models/AuditLog'
import { MatchModel } from '../models/Match'
import { connectMongo } from '../utils/db'

interface LockStartedMatchesOptions {
  source?: string
}

export class PredictionLockService {
  async lockStartedMatches(options: LockStartedMatchesOptions = {}) {
    await connectMongo()

    const lockedAt = new Date()
    const result = await MatchModel.updateMany(
      {
        kickoffAt: { $lte: lockedAt },
        predictionsLocked: false,
        status: { $ne: 'cancelled' }
      },
      {
        $set: {
          predictionsLocked: true
        }
      },
      { runValidators: true }
    )

    const lockedMatches = result.modifiedCount || 0

    if (lockedMatches > 0) {
      await AuditLogModel.create({
        action: 'PREDICTIONS_AUTO_LOCKED',
        entity: 'Match',
        entityType: 'Match',
        after: {
          lockedMatches,
          lockedAt,
          source: options.source || 'automatic'
        },
        metadata: {
          lockedMatches,
          lockedAt,
          source: options.source || 'automatic'
        }
      })
    }

    return {
      lockedMatches
    }
  }
}

export const predictionLockService = new PredictionLockService()
