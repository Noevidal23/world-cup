import { MatchModel } from '../../../models/Match'
import { TeamModel } from '../../../models/Team'
import { requireAdminUser } from '../../../utils/auth'
import { connectMongo } from '../../../utils/db'
import { serializeMatch } from '../../../utils/matches'
import { matchQuerySchema } from '../../../validators/matches'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const query = matchQuerySchema.parse(getQuery(event))
  await connectMongo()

  const filters: Record<string, unknown> = {}

  if (query.group !== 'all') {
    filters.group = query.group
  }

  if (query.stage !== 'all') {
    filters.stage = query.stage
  }

  if (query.status !== 'all') {
    filters.status = query.status
  }

  const skip = (query.page - 1) * query.pageSize
  const [matches, total, teams, groups] = await Promise.all([
    MatchModel.find(filters)
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ matchNumber: 1 })
      .skip(skip)
      .limit(query.pageSize)
      .lean(),
    MatchModel.countDocuments(filters),
    TeamModel.find({ isActive: true }).sort({ name: 1 }).lean(),
    MatchModel.distinct('group', { group: { $exists: true, $nin: ['', null] } })
  ])

  return {
    matches: matches.map(serializeMatch),
    teams: teams.map(team => ({
      id: String(team._id),
      fifaCode: team.fifaCode,
      name: team.name,
      group: team.group
    })),
    groups: groups.sort(),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / query.pageSize))
    }
  }
})
