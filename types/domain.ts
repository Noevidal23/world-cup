export type UserRole = 'participant' | 'admin'

export type UserStatus = 'active' | 'inactive'

export interface AuthUser {
  id: string
  name: string
  username: string
  email: string
  role: UserRole
  status: UserStatus
}

export interface AdminUser extends AuthUser {
  createdAt: string
  updatedAt: string
}

export type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled'

export type ScoringMode = 'regular_time' | 'extra_time' | 'penalties_final'

export type MatchResultSide = 'home' | 'away' | 'draw'

export type PenaltyWinner = 'home' | 'away'

export interface AdminTeamOption {
  id: string
  fifaCode: string
  name: string
  group?: string
  flagUrl?: string
}

export interface AdminMatch {
  id: string
  matchNumber: number
  stage: MatchStage
  group?: string
  homeTeamId?: string
  awayTeamId?: string
  homeTeam?: AdminTeamOption
  awayTeam?: AdminTeamOption
  homeSlotLabel?: string
  awaySlotLabel?: string
  kickoffAt: string
  stadium?: string
  city?: string
  status: MatchStatus
  predictionsLocked: boolean
  scoringMode: ScoringMode
  partialHomeGoals?: number
  partialAwayGoals?: number
  partialMinute?: number
  partialStatusText?: string
  regularHomeGoals?: number
  regularAwayGoals?: number
  regularResult?: MatchResultSide
  extraTimeHomeGoals?: number
  extraTimeAwayGoals?: number
  extraTimeResult?: MatchResultSide
  penaltyHomeGoals?: number
  penaltyAwayGoals?: number
  penaltyWinner?: PenaltyWinner
  finalWinner?: MatchResultSide
  createdAt: string
  updatedAt: string
}

export type PredictedResult = 'home' | 'away' | 'draw'

export type PredictionStatus = 'pending' | 'evaluated'

export interface ParticipantPrediction {
  id: string
  userId: string
  matchId: string
  predictedHomeGoals: number
  predictedAwayGoals: number
  predictedResult: PredictedResult
  predictedExtraTimeHomeGoals?: number
  predictedExtraTimeAwayGoals?: number
  predictedExtraTimeResult?: PredictedResult
  predictedPenaltyHomeGoals?: number
  predictedPenaltyAwayGoals?: number
  predictedPenaltyWinner?: Exclude<PredictedResult, 'draw'>
  status: PredictionStatus
  pointsWinner: number
  pointsExactScore: number
  totalPoints: number
  possiblePoints: number
  createdAt: string
  updatedAt: string
}

export interface PredictionMatch extends AdminMatch {
  prediction?: ParticipantPrediction
  canPredict: boolean
  lockReason?: string
}

export type QualifiedStatus = 'pending' | 'qualified_direct' | 'possible_best_third' | 'qualified_best_third' | 'eliminated'

export interface GroupStandingRow {
  id: string
  group: string
  teamId: string
  team?: AdminTeamOption
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
  fairPlayPoints: number
  position: number
  qualifiedStatus: QualifiedStatus
  updatedAt: string
}

export interface BestThirdOverride {
  teamId: string
  qualifiedStatus?: Extract<QualifiedStatus, 'qualified_best_third' | 'possible_best_third' | 'eliminated'>
  sortOrder?: number
  justification: string
  updatedAt: string
}

export interface BestThirdRow extends GroupStandingRow {
  automaticRank: number
  automaticQualified: boolean
  override?: BestThirdOverride
}

export type KnockoutSourceType = 'group_winner' | 'group_runner_up' | 'best_third' | 'match_winner' | 'manual'

export interface KnockoutSlotRow {
  id: string
  stage: Exclude<MatchStage, 'group'>
  matchNumber: number
  slot: string
  sourceType: KnockoutSourceType
  sourceLabel: string
  teamId?: string
  team?: AdminTeamOption
  isManualOverride: boolean
  overrideReason?: string
  updatedAt: string
}

export interface RankingRow {
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
  lastPredictionAt?: string
}

export interface AuditLogRow {
  id: string
  user?: {
    id: string
    name: string
    username: string
  }
  action: string
  entity: string
  entityId?: string
  before?: unknown
  after?: unknown
  ip?: string
  userAgent?: string
  createdAt: string
}

export type ScoreCriterion = 'regulation' | 'extraTime' | 'penalties'

export interface Score {
  home: number
  away: number
}

export interface PointsConfig {
  regulation: boolean
  extraTime: boolean
  penalties: boolean
}
