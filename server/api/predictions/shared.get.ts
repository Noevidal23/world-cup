import { MatchModel } from '../../models/Match'
import { PredictionModel } from '../../models/Prediction'
import { requireParticipantUser } from '../../utils/auth'
import { connectMongo } from '../../utils/db'
import { serializeMatch } from '../../utils/matches'
import { serializePrediction } from '../../utils/predictions'

const serializeParticipant = (user: unknown) => {
  if (!user || typeof user !== 'object' || !('_id' in user)) {
    return undefined
  }

  const value = user as {
    _id: unknown
    name: string
    username: string
  }

  return {
    id: String(value._id),
    name: value.name,
    username: value.username
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireParticipantUser(event)

  await connectMongo()

  const matches = await MatchModel.find({
    status: { $ne: 'cancelled' },
    $or: [
      { predictionsLocked: true },
      { status: { $in: ['live', 'finished'] } }
    ]
  })
    .populate('homeTeamId')
    .populate('awayTeamId')
    .sort({ kickoffAt: 1, matchNumber: 1 })
    .lean()

  const matchIds = matches.map(match => match._id)
  const predictions = await PredictionModel.find({
    matchId: { $in: matchIds },
    userId: { $ne: user.id }
  })
    .populate('userId')
    .sort({ updatedAt: 1 })
    .lean()

  const predictionsByMatch = new Map<string, Array<{
    participant: ReturnType<typeof serializeParticipant>
    prediction: ReturnType<typeof serializePrediction>
  }>>()

  for (const prediction of predictions) {
    const participant = serializeParticipant(prediction.userId)

    if (!participant) {
      continue
    }

    const rows = predictionsByMatch.get(String(prediction.matchId)) || []
    rows.push({
      participant,
      prediction: serializePrediction(prediction)
    })
    predictionsByMatch.set(String(prediction.matchId), rows)
  }

  return {
    matches: matches
      .map(match => ({
        match: serializeMatch(match),
        predictions: predictionsByMatch.get(String(match._id)) || []
      }))
      .filter(item => item.predictions.length > 0)
  }
})
