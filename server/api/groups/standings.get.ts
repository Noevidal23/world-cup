import { GroupStandingModel } from '../../models/GroupStanding'
import { TeamModel } from '../../models/Team'
import { connectMongo } from '../../utils/db'
import { serializeGroupStanding } from '../../utils/groupStandings'
import type { GroupStandingRow } from '../../../types/domain'

export default defineEventHandler(async () => {
  await connectMongo()

  const standings = await GroupStandingModel.find({})
    .populate('teamId')
    .sort({ group: 1, position: 1 })
    .lean()

  const groups = standings.reduce<Record<string, ReturnType<typeof serializeGroupStanding>[]>>((acc, standing) => {
    const row = serializeGroupStanding(standing)
    const rows = acc[row.group] || []
    rows.push(row)
    acc[row.group] = rows
    return acc
  }, {})

  const teams = await TeamModel.find({ group: { $exists: true, $nin: ['', null] }, isActive: true })
    .sort({ group: 1, name: 1 })
    .lean()

  for (const team of teams) {
    if (!team.group) {
      continue
    }

    const rows = groups[team.group] || []
    const hasStanding = rows.some(row => row.teamId === String(team._id))

    if (hasStanding) {
      continue
    }

    const row: GroupStandingRow = {
      id: `preview-${String(team._id)}`,
      group: team.group,
      teamId: String(team._id),
      team: {
        id: String(team._id),
        fifaCode: team.fifaCode,
        name: team.name,
        group: team.group,
        flagUrl: team.flagUrl || undefined
      },
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      yellowCards: 0,
      redCards: 0,
      fairPlayPoints: 0,
      position: rows.length + 1,
      qualifiedStatus: 'pending',
      updatedAt: new Date(0).toISOString()
    }

    rows.push(row)
    groups[team.group] = rows
  }

  for (const rows of Object.values(groups)) {
    rows.sort((a, b) => a.position - b.position || (a.team?.name || '').localeCompare(b.team?.name || ''))
    rows.forEach((row, index) => {
      row.position = index + 1
    })
  }

  return {
    groups
  }
})
