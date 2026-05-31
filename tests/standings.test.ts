import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareBestThirds, compareStandings, fairPlayPenalty, getGroupQualifiedStatus } from '../server/utils/standingsRules'

describe('standings rules', () => {
  it('orders group standings by points, goal difference, goals for and fair play', () => {
    const rows = [
      { group: 'A', points: 4, goalDifference: 1, goalsFor: 3, fairPlayPoints: -3, name: 'fair-play-worse' },
      { group: 'A', points: 4, goalDifference: 1, goalsFor: 3, fairPlayPoints: -1, name: 'fair-play-better' },
      { group: 'A', points: 6, goalDifference: 1, goalsFor: 2, fairPlayPoints: -5, name: 'leader' }
    ].sort(compareStandings)

    assert.deepEqual(rows.map(row => row.name), ['leader', 'fair-play-better', 'fair-play-worse'])
  })

  it('calculates fair play penalties', () => {
    assert.equal(fairPlayPenalty(2, 1, 1), -9)
  })

  it('marks completed group qualifiers', () => {
    assert.equal(getGroupQualifiedStatus(1, true), 'qualified_direct')
    assert.equal(getGroupQualifiedStatus(3, true), 'possible_best_third')
    assert.equal(getGroupQualifiedStatus(4, true), 'eliminated')
    assert.equal(getGroupQualifiedStatus(1, false), 'pending')
  })

  it('uses manual sort order only after sporting criteria for best thirds', () => {
    const rows = [
      { group: 'B', points: 4, goalDifference: 0, goalsFor: 2, fairPlayPoints: -2, override: { sortOrder: 1 } },
      { group: 'A', points: 4, goalDifference: 1, goalsFor: 2, fairPlayPoints: -2, override: { sortOrder: 99 } },
      { group: 'C', points: 4, goalDifference: 0, goalsFor: 2, fairPlayPoints: -2, override: { sortOrder: 2 } }
    ].sort(compareBestThirds)

    assert.deepEqual(rows.map(row => row.group), ['A', 'B', 'C'])
  })
})
