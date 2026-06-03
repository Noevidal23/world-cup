import { MatchModel, type MatchDocument } from '../models/Match'
import { PredictionModel, type PredictionDocument } from '../models/Prediction'
import { rankingService } from './RankingService'
import { connectMongo } from '../utils/db'
import { calculateResultSide } from '../utils/results'
import type { MatchResultSide, ScoringMode } from '../../types/domain'

interface OfficialScore {
  homeGoals: number
  awayGoals: number
  resultType: MatchResultSide
}

interface EvaluationResult {
  pointsWinner: number
  pointsExactScore: number
  totalPoints: number
  possiblePoints: number
}

type MatchLike = MatchDocument & { _id: unknown }
type PredictionLike = PredictionDocument & { save: () => Promise<unknown> }

export class PredictionScoreService {
  private isKnockoutMatch(match: MatchLike) {
    return match.stage !== 'group'
  }

  getResultType(match: MatchLike): MatchResultSide {
    if (match.status !== 'finished') {
      throw new Error('Solo se evalúan partidos finalizados')
    }

    if (match.scoringMode === 'penalties_final') {
      if (!match.finalWinner) {
        throw new Error('El partido no tiene ganador final')
      }

      return match.finalWinner
    }

    if (match.scoringMode === 'extra_time') {
      if (!match.extraTimeResult) {
        throw new Error('El partido no tiene resultado de tiempos extra')
      }

      return match.extraTimeResult
    }

    if (!match.regularResult) {
      throw new Error('El partido no tiene resultado de 90 minutos')
    }

    return match.regularResult
  }

  calculateWinnerPoint(prediction: PredictionLike, match: MatchLike) {
    return prediction.predictedResult === this.getResultType(match) ? 1 : 0
  }

  calculateExactScorePoint(prediction: PredictionLike, match: MatchLike) {
    const officialScore = this.getOfficialScoreForExactScore(match)

    return prediction.predictedHomeGoals === officialScore.homeGoals && prediction.predictedAwayGoals === officialScore.awayGoals ? 1 : 0
  }

  async evaluatePrediction(prediction: PredictionLike, match: MatchLike) {
    if (this.isKnockoutMatch(match)) {
      return await this.evaluateKnockoutPrediction(prediction, match)
    }

    const points: EvaluationResult = {
      pointsWinner: this.calculateWinnerPoint(prediction, match),
      pointsExactScore: this.calculateExactScorePoint(prediction, match),
      totalPoints: 0,
      possiblePoints: 2
    }

    points.totalPoints = Math.min(2, points.pointsWinner + points.pointsExactScore)

    prediction.pointsWinner = points.pointsWinner
    prediction.pointsExactScore = points.pointsExactScore
    prediction.totalPoints = points.totalPoints
    prediction.possiblePoints = points.possiblePoints
    prediction.status = 'evaluated'
    await prediction.save()

    return points
  }

  async evaluateMatchPredictions(matchId: string) {
    await connectMongo()

    const match = await MatchModel.findById(matchId)

    if (!match) {
      throw new Error('Partido no encontrado')
    }

    this.assertMatchCanBeEvaluated(match)

    const predictions = await PredictionModel.find({ matchId: match._id })
    const results = []

    for (const prediction of predictions) {
      results.push(await this.evaluatePrediction(prediction, match))
    }

    const ranking = await this.recalculateAll()

    return {
      evaluated: results.length,
      ...ranking
    }
  }

  async recalculateAll() {
    return rankingService.recalculateAll()
  }

  private getOfficialScoreForExactScore(match: MatchLike): OfficialScore {
    const scoringMode = match.scoringMode as ScoringMode

    if (scoringMode === 'extra_time' || scoringMode === 'penalties_final') {
      if (match.extraTimeHomeGoals !== undefined && match.extraTimeAwayGoals !== undefined && match.extraTimeHomeGoals !== null && match.extraTimeAwayGoals !== null) {
        return {
          homeGoals: match.extraTimeHomeGoals,
          awayGoals: match.extraTimeAwayGoals,
          resultType: calculateResultSide(match.extraTimeHomeGoals, match.extraTimeAwayGoals)
        }
      }
    }

    if (match.regularHomeGoals === undefined || match.regularAwayGoals === undefined || match.regularHomeGoals === null || match.regularAwayGoals === null) {
      throw new Error('El partido no tiene marcador oficial para evaluar exact score')
    }

    return {
      homeGoals: match.regularHomeGoals,
      awayGoals: match.regularAwayGoals,
      resultType: calculateResultSide(match.regularHomeGoals, match.regularAwayGoals)
    }
  }

  private async evaluateKnockoutPrediction(prediction: PredictionLike, match: MatchLike) {
    const points: EvaluationResult = {
      pointsWinner: 0,
      pointsExactScore: 0,
      totalPoints: 0,
      possiblePoints: 0
    }

    const addCriterion = (
      predictedHomeGoals: number | null | undefined,
      predictedAwayGoals: number | null | undefined,
      predictedResult: MatchResultSide | null | undefined,
      officialHomeGoals: number | null | undefined,
      officialAwayGoals: number | null | undefined,
      officialResult: MatchResultSide | null | undefined
    ) => {
      if (officialHomeGoals === undefined || officialHomeGoals === null || officialAwayGoals === undefined || officialAwayGoals === null || !officialResult) {
        return
      }

      points.possiblePoints += 2

      if (predictedResult === officialResult) {
        points.pointsWinner += 1
      }

      if (predictedHomeGoals === officialHomeGoals && predictedAwayGoals === officialAwayGoals) {
        points.pointsExactScore += 1
      }
    }

    addCriterion(
      prediction.predictedHomeGoals,
      prediction.predictedAwayGoals,
      prediction.predictedResult,
      match.regularHomeGoals,
      match.regularAwayGoals,
      match.regularResult
    )

    if (match.regularResult === 'draw') {
      addCriterion(
        prediction.predictedExtraTimeHomeGoals,
        prediction.predictedExtraTimeAwayGoals,
        prediction.predictedExtraTimeResult,
        match.extraTimeHomeGoals,
        match.extraTimeAwayGoals,
        match.extraTimeResult
      )
    }

    if (match.regularResult === 'draw' && match.extraTimeResult === 'draw') {
      const officialPenaltyWinner = match.penaltyWinner || (match.finalWinner === 'home' || match.finalWinner === 'away' ? match.finalWinner : undefined)

      if (match.penaltyHomeGoals !== undefined && match.penaltyHomeGoals !== null && match.penaltyAwayGoals !== undefined && match.penaltyAwayGoals !== null && officialPenaltyWinner) {
        const predictedPenaltyWinner = prediction.predictedPenaltyHomeGoals !== undefined && prediction.predictedPenaltyHomeGoals !== null && prediction.predictedPenaltyAwayGoals !== undefined && prediction.predictedPenaltyAwayGoals !== null
          ? calculateResultSide(prediction.predictedPenaltyHomeGoals, prediction.predictedPenaltyAwayGoals)
          : undefined

        points.possiblePoints += 2

        if (predictedPenaltyWinner === officialPenaltyWinner) {
          points.pointsWinner += 1
        }

        if (prediction.predictedPenaltyHomeGoals === match.penaltyHomeGoals && prediction.predictedPenaltyAwayGoals === match.penaltyAwayGoals) {
          points.pointsExactScore += 1
        }
      }
    }

    if (points.possiblePoints === 0) {
      throw new Error('El partido no tiene resultados oficiales calificables')
    }

    points.totalPoints = points.pointsWinner + points.pointsExactScore

    prediction.pointsWinner = points.pointsWinner
    prediction.pointsExactScore = points.pointsExactScore
    prediction.totalPoints = points.totalPoints
    prediction.possiblePoints = points.possiblePoints
    prediction.status = 'evaluated'
    await prediction.save()

    return points
  }

  private assertMatchCanBeEvaluated(match: MatchLike) {
    if (match.status !== 'finished') {
      throw new Error('Solo se evalúan resultados finales')
    }

    if (this.isKnockoutMatch(match)) {
      if (match.regularHomeGoals === undefined || match.regularAwayGoals === undefined || match.regularResult === undefined) {
        throw new Error('El partido no tiene marcador de 90 minutos')
      }

      if (match.regularResult === 'draw' && (match.extraTimeHomeGoals === undefined || match.extraTimeAwayGoals === undefined || !match.extraTimeResult)) {
        throw new Error('El partido no tiene marcador de tiempos extra')
      }

      if (match.regularResult === 'draw' && match.extraTimeResult === 'draw' && (match.penaltyHomeGoals === undefined || match.penaltyAwayGoals === undefined || !match.penaltyWinner)) {
        throw new Error('El partido no tiene marcador de penales')
      }

      return
    }

    this.getResultType(match)
    this.getOfficialScoreForExactScore(match)
  }
}

export const predictionScoreService = new PredictionScoreService()
