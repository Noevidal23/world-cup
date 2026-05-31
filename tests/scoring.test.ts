import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PredictionScoreService } from '../server/services/PredictionScoreService'
import { calculateFinalWinner, calculateResultSide } from '../server/utils/results'

describe('result helpers', () => {
  it('calculates the match result side', () => {
    assert.equal(calculateResultSide(2, 1), 'home')
    assert.equal(calculateResultSide(0, 3), 'away')
    assert.equal(calculateResultSide(1, 1), 'draw')
  })

  it('uses penalties as final winner when configured', () => {
    assert.equal(calculateFinalWinner({
      scoringMode: 'penalties_final',
      regularResult: 'draw',
      extraTimeResult: 'draw',
      penaltyWinner: 'away'
    }), 'away')
  })
})

describe('PredictionScoreService', () => {
  const service = new PredictionScoreService()

  it('gives winner and exact score points with a maximum of two', async () => {
    const prediction = {
      predictedHomeGoals: 2,
      predictedAwayGoals: 1,
      predictedResult: 'home',
      status: 'pending',
      pointsWinner: 0,
      pointsExactScore: 0,
      totalPoints: 0,
      possiblePoints: 2,
      save: async () => undefined
    }
    const match = {
      _id: 'match-1',
      status: 'finished',
      scoringMode: 'regular_time',
      regularHomeGoals: 2,
      regularAwayGoals: 1,
      regularResult: 'home'
    }

    const result = await service.evaluatePrediction(prediction as never, match as never)

    assert.deepEqual(result, {
      pointsWinner: 1,
      pointsExactScore: 1,
      totalPoints: 2,
      possiblePoints: 2
    })
    assert.equal(prediction.status, 'evaluated')
  })

  it('scores knockout regular and extra time when penalties are not needed', async () => {
    const prediction = {
      predictedHomeGoals: 1,
      predictedAwayGoals: 1,
      predictedResult: 'draw',
      predictedExtraTimeHomeGoals: 2,
      predictedExtraTimeAwayGoals: 1,
      predictedExtraTimeResult: 'home',
      status: 'pending',
      pointsWinner: 0,
      pointsExactScore: 0,
      totalPoints: 0,
      possiblePoints: 2,
      save: async () => undefined
    }
    const match = {
      _id: 'match-2',
      status: 'finished',
      scoringMode: 'penalties_final',
      regularHomeGoals: 0,
      regularAwayGoals: 0,
      regularResult: 'draw',
      extraTimeHomeGoals: 2,
      extraTimeAwayGoals: 1,
      extraTimeResult: 'home',
      finalWinner: 'home'
    }

    const result = await service.evaluatePrediction(prediction as never, match as never)

    assert.equal(result.pointsWinner, 2)
    assert.equal(result.pointsExactScore, 1)
    assert.equal(result.totalPoints, 3)
    assert.equal(result.possiblePoints, 4)
  })

  it('scores knockout regular, extra time and penalties up to six points', async () => {
    const prediction = {
      predictedHomeGoals: 1,
      predictedAwayGoals: 1,
      predictedResult: 'draw',
      predictedExtraTimeHomeGoals: 2,
      predictedExtraTimeAwayGoals: 2,
      predictedExtraTimeResult: 'draw',
      predictedPenaltyHomeGoals: 5,
      predictedPenaltyAwayGoals: 4,
      predictedPenaltyWinner: 'home',
      status: 'pending',
      pointsWinner: 0,
      pointsExactScore: 0,
      totalPoints: 0,
      possiblePoints: 2,
      save: async () => undefined
    }
    const match = {
      _id: 'match-3',
      stage: 'round_of_16',
      status: 'finished',
      scoringMode: 'penalties_final',
      regularHomeGoals: 1,
      regularAwayGoals: 1,
      regularResult: 'draw',
      extraTimeHomeGoals: 2,
      extraTimeAwayGoals: 2,
      extraTimeResult: 'draw',
      penaltyHomeGoals: 5,
      penaltyAwayGoals: 4,
      penaltyWinner: 'home',
      finalWinner: 'home'
    }

    const result = await service.evaluatePrediction(prediction as never, match as never)

    assert.deepEqual(result, {
      pointsWinner: 3,
      pointsExactScore: 3,
      totalPoints: 6,
      possiblePoints: 6
    })
    assert.equal(prediction.totalPoints, 6)
    assert.equal(prediction.possiblePoints, 6)
  })
})
