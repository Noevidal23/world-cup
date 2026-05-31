import type { QualifiedStatus } from '../../types/domain'

export interface StandingComparable {
  points: number
  goalDifference: number
  goalsFor: number
  fairPlayPoints: number
  group?: string
}

export const fairPlayPenalty = (yellowCards: number, redCards: number, secondYellowRedCards: number) =>
  yellowCards * -1 + secondYellowRedCards * -3 + redCards * -4

const compareStandingCriteria = <T extends StandingComparable>(a: T, b: T) =>
  b.points - a.points
  || b.goalDifference - a.goalDifference
  || b.goalsFor - a.goalsFor
  || b.fairPlayPoints - a.fairPlayPoints

export const compareStandings = <T extends StandingComparable>(a: T, b: T) =>
  compareStandingCriteria(a, b)
  || (a.group || '').localeCompare(b.group || '')

export const compareBestThirds = <T extends StandingComparable & { override?: { sortOrder?: number } }>(a: T, b: T) =>
  compareStandingCriteria(a, b)
  || (a.override?.sortOrder || 99) - (b.override?.sortOrder || 99)
  || (a.group || '').localeCompare(b.group || '')

export const getGroupQualifiedStatus = (position: number, isComplete: boolean): QualifiedStatus => {
  if (!isComplete) {
    return 'pending'
  }

  if (position <= 2) {
    return 'qualified_direct'
  }

  if (position === 3) {
    return 'possible_best_third'
  }

  return 'eliminated'
}
