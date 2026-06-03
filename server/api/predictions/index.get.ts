import { MatchModel } from '../../models/Match'
import { PredictionModel } from '../../models/Prediction'
import { requireParticipantUser } from '../../utils/auth'
import { connectMongo } from '../../utils/db'
import { serializeMatch } from '../../utils/matches'
import { getPredictionLockReason, serializePrediction } from '../../utils/predictions'

export default defineEventHandler(async (event) => {
  const user = await requireParticipantUser(event)

  await connectMongo()

  const [matches, predictions] = await Promise.all([
    MatchModel.find({ status: { $ne: 'cancelled' } })
      .populate('homeTeamId')
      .populate('awayTeamId')
      .sort({ kickoffAt: 1, matchNumber: 1 })
      .lean(),
    PredictionModel.find({ userId: user.id }).lean()
  ])

  const predictionsByMatch = new Map(predictions.map(prediction => [
    String(prediction.matchId),
    serializePrediction(prediction)
  ]))

  return {
    matches: matches.map((match) => {
      const serializedMatch = serializeMatch(match)
      const lockReason = getPredictionLockReason(match)

      return {
        ...serializedMatch,
        prediction: predictionsByMatch.get(String(match._id)),
        canPredict: !lockReason,
        lockReason
      }
    })
  }
})
