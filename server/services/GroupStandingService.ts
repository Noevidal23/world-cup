import type { Types } from 'mongoose'
import { GroupStandingModel } from '../models/GroupStanding'
import { MatchDisciplineModel } from '../models/MatchDiscipline'
import { MatchModel } from '../models/Match'
import { TeamModel } from '../models/Team'
import { connectMongo } from '../utils/db'
import { compareStandings, fairPlayPenalty, getGroupQualifiedStatus } from '../utils/standingsRules'
import type { QualifiedStatus } from '../../types/domain'

interface StandingAccumulator {
  group: string
  teamId: Types.ObjectId
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  yellowCards: number
  redCards: number
  secondYellowRedCards: number
  fairPlayPoints: number
  position: number
  qualifiedStatus: QualifiedStatus
}

const createStanding = (group: string, teamId: Types.ObjectId): StandingAccumulator => ({
  group,
  teamId,
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
  secondYellowRedCards: 0,
  fairPlayPoints: 0,
  position: 0,
  qualifiedStatus: 'pending'
})

export class GroupStandingService {
  async recalculate() {
    await connectMongo()

    const teams = await TeamModel.find({ group: { $exists: true, $nin: ['', null] }, isActive: true }).lean()
    const groupMatches = await MatchModel.find({ stage: 'group', group: { $exists: true, $nin: ['', null] } }).lean()
    const disciplines = await MatchDisciplineModel.find({}).lean()
    const standingsByTeam = new Map<string, StandingAccumulator>()
    const groups = new Set<string>()

    for (const team of teams) {
      if (!team.group) {
        continue
      }

      groups.add(team.group)
      standingsByTeam.set(String(team._id), createStanding(team.group, team._id))
    }

    for (const discipline of disciplines) {
      const standing = standingsByTeam.get(String(discipline.teamId))

      if (!standing) {
        continue
      }

      standing.yellowCards += discipline.yellowCards
      standing.redCards += discipline.redCards
      standing.secondYellowRedCards += discipline.secondYellowRedCards
      standing.fairPlayPoints += fairPlayPenalty(discipline.yellowCards, discipline.redCards, discipline.secondYellowRedCards)
    }

    for (const match of groupMatches) {
      if (match.status !== 'finished' || match.regularHomeGoals === undefined || match.regularAwayGoals === undefined || match.regularHomeGoals === null || match.regularAwayGoals === null || !match.homeTeamId || !match.awayTeamId) {
        continue
      }

      const homeStanding = standingsByTeam.get(String(match.homeTeamId))
      const awayStanding = standingsByTeam.get(String(match.awayTeamId))

      if (!homeStanding || !awayStanding) {
        continue
      }

      this.applyMatchResult(homeStanding, match.regularHomeGoals, match.regularAwayGoals)
      this.applyMatchResult(awayStanding, match.regularAwayGoals, match.regularHomeGoals)
    }

    let updated = 0

    for (const group of groups) {
      const groupRows = [...standingsByTeam.values()]
        .filter(row => row.group === group)
        .sort(compareStandings)
      const isComplete = this.isGroupComplete(group, groupRows, groupMatches)

      for (const [index, row] of groupRows.entries()) {
        row.position = index + 1
        row.qualifiedStatus = getGroupQualifiedStatus(row.position, isComplete)

        await GroupStandingModel.findOneAndUpdate(
          { group: row.group, teamId: row.teamId },
          {
            group: row.group,
            teamId: row.teamId,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalDifference,
            points: row.points,
            yellowCards: row.yellowCards,
            redCards: row.redCards,
            fairPlayPoints: row.fairPlayPoints,
            position: row.position,
            qualifiedStatus: row.qualifiedStatus
          },
          { upsert: true, returnDocument: 'after', runValidators: true }
        )
        updated++
      }
    }

    return {
      groupsUpdated: groups.size,
      standingsUpdated: updated
    }
  }

  private applyMatchResult(row: StandingAccumulator, goalsFor: number, goalsAgainst: number) {
    row.played++
    row.goalsFor += goalsFor
    row.goalsAgainst += goalsAgainst
    row.goalDifference = row.goalsFor - row.goalsAgainst

    if (goalsFor > goalsAgainst) {
      row.won++
      row.points += 3
    } else if (goalsFor === goalsAgainst) {
      row.drawn++
      row.points += 1
    } else {
      row.lost++
    }
  }

  private isGroupComplete(group: string, rows: StandingAccumulator[], matches: Array<{ group?: string | null, status: string }>) {
    const expectedMatches = rows.length > 1 ? (rows.length * (rows.length - 1)) / 2 : 0
    const finishedMatches = matches.filter(match => match.group === group && match.status === 'finished').length

    return expectedMatches > 0 && finishedMatches >= expectedMatches
  }
}

export const groupStandingService = new GroupStandingService()
