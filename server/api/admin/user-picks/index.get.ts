import { MatchModel } from '../../../models/Match'
import { PredictionModel } from '../../../models/Prediction'
import { UserModel } from '../../../models/User'
import { requireAdminUser } from '../../../utils/auth'
import { connectMongo } from '../../../utils/db'
import { serializeMatch } from '../../../utils/matches'
import { serializePrediction } from '../../../utils/predictions'
import { userPicksQuerySchema } from '../../../validators/userPicks'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const parsed = userPicksQuerySchema.safeParse(getQuery(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Usuario invalido',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  const participants = await UserModel.find({ role: 'participant' })
    .select('name username email status')
    .sort({ name: 1, username: 1 })
    .lean()

  const selectedParticipant = parsed.data.userId
    ? participants.find(participant => String(participant._id) === parsed.data.userId)
    : participants[0]

  if (parsed.data.userId && !selectedParticipant) {
    throw createError({
      statusCode: 404,
      message: 'Participante no encontrado'
    })
  }

  if (!selectedParticipant) {
    return {
      participants: [],
      selectedParticipant: null,
      summary: null,
      picks: []
    }
  }

  const predictions = await PredictionModel.find({ userId: selectedParticipant._id })
    .sort({ updatedAt: -1 })
    .lean()
  const matchIds = predictions.map(prediction => prediction.matchId)
  const matches = await MatchModel.find({ _id: { $in: matchIds } })
    .populate('homeTeamId')
    .populate('awayTeamId')
    .lean()
  const matchesById = new Map(matches.map(match => [String(match._id), serializeMatch(match)]))
  const serializedPredictions = predictions.map(serializePrediction)

  return {
    participants: participants.map(participant => ({
      id: String(participant._id),
      name: participant.name,
      username: participant.username,
      email: participant.email,
      status: participant.status
    })),
    selectedParticipant: {
      id: String(selectedParticipant._id),
      name: selectedParticipant.name,
      username: selectedParticipant.username,
      email: selectedParticipant.email,
      status: selectedParticipant.status
    },
    summary: {
      totalPoints: serializedPredictions.reduce((total, prediction) => total + prediction.totalPoints, 0),
      picks: serializedPredictions.length,
      evaluated: serializedPredictions.filter(prediction => prediction.status === 'evaluated').length,
      winnerPoints: serializedPredictions.reduce((total, prediction) => total + prediction.pointsWinner, 0),
      exactScorePoints: serializedPredictions.reduce((total, prediction) => total + prediction.pointsExactScore, 0)
    },
    picks: serializedPredictions
      .map(prediction => ({
        prediction,
        match: matchesById.get(prediction.matchId)
      }))
      .filter(item => item.match)
  }
})
