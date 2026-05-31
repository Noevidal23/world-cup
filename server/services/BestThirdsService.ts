import { BestThirdOverrideModel } from '../models/BestThirdOverride'
import { GroupStandingModel } from '../models/GroupStanding'
import { connectMongo } from '../utils/db'
import { serializeGroupStanding } from '../utils/groupStandings'
import { compareBestThirds } from '../utils/standingsRules'
import type { BestThirdOverride, BestThirdRow, QualifiedStatus } from '../../types/domain'

interface RecalculateOptions {
  override?: {
    teamId: string
    qualifiedStatus?: Extract<QualifiedStatus, 'qualified_best_third' | 'possible_best_third' | 'eliminated'>
    sortOrder?: number | null
    justification: string
  }
}

const serializeOverride = (override: {
  teamId: unknown
  qualifiedStatus?: BestThirdOverride['qualifiedStatus'] | null
  sortOrder?: number | null
  justification: string
  updatedAt: Date | string
}): BestThirdOverride => ({
  teamId: String(override.teamId),
  qualifiedStatus: override.qualifiedStatus || undefined,
  sortOrder: override.sortOrder || undefined,
  justification: override.justification,
  updatedAt: new Date(override.updatedAt).toISOString()
})

export class BestThirdsService {
  async getBestThirds() {
    await connectMongo()

    const [thirds, overrides] = await Promise.all([
      GroupStandingModel.find({ position: 3 }).populate('teamId').lean(),
      BestThirdOverrideModel.find({ active: true }).lean()
    ])
    const overridesByTeam = new Map(overrides.map(override => [String(override.teamId), serializeOverride(override)]))

    const sorted = thirds
      .map((standing) => {
        const row = serializeGroupStanding(standing)
        return {
          ...row,
          override: overridesByTeam.get(row.teamId)
        }
      })
      .sort(compareBestThirds)

    return sorted.map<BestThirdRow>((row, index) => {
      const automaticQualified = index < 8
      return {
        ...row,
        automaticRank: index + 1,
        automaticQualified,
        qualifiedStatus: row.override?.qualifiedStatus || (automaticQualified ? 'qualified_best_third' : 'eliminated')
      }
    })
  }

  async recalculate(options: RecalculateOptions = {}) {
    await connectMongo()

    if (options.override) {
      await BestThirdOverrideModel.findOneAndUpdate(
        { teamId: options.override.teamId },
        {
          teamId: options.override.teamId,
          qualifiedStatus: options.override.qualifiedStatus,
          sortOrder: options.override.sortOrder || undefined,
          justification: options.override.justification,
          active: true
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
      )
    }

    const thirds = await this.getBestThirds()

    for (const third of thirds) {
      await GroupStandingModel.updateOne(
        { _id: third.id },
        { $set: { qualifiedStatus: third.qualifiedStatus } },
        { runValidators: true }
      )
    }

    return {
      thirds,
      classified: thirds.filter(row => row.qualifiedStatus === 'qualified_best_third').length,
      eliminated: thirds.filter(row => row.qualifiedStatus === 'eliminated').length
    }
  }
}

export const bestThirdsService = new BestThirdsService()
