import bcrypt from 'bcrypt'
import { AuditLogModel } from '../../../models/AuditLog'
import { BestThirdOverrideModel } from '../../../models/BestThirdOverride'
import { GroupStandingModel } from '../../../models/GroupStanding'
import { KnockoutSlotModel } from '../../../models/KnockoutSlot'
import { MatchModel } from '../../../models/Match'
import { MatchDisciplineModel } from '../../../models/MatchDiscipline'
import { PredictionModel } from '../../../models/Prediction'
import { TeamModel } from '../../../models/Team'
import { UserModel } from '../../../models/User'
import { UserRankingModel } from '../../../models/UserRanking'
import { requireAdminUser } from '../../../utils/auth'
import { createAuditLog } from '../../../utils/audit'
import { connectMongo } from '../../../utils/db'
import { tournamentResetSchema } from '../../../validators/tournament'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const parsed = tournamentResetSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Confirmación inválida',
      data: parsed.error.flatten()
    })
  }

  await connectMongo()

  const adminWithPassword = await UserModel.findById(admin.id).select('+passwordHash')

  if (!adminWithPassword) {
    throw createError({
      statusCode: 401,
      message: 'Sesión inválida'
    })
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, adminWithPassword.passwordHash)

  if (!passwordMatches) {
    throw createError({
      statusCode: 403,
      message: 'La contraseña no coincide con el administrador actual'
    })
  }

  const before = {
    teams: await TeamModel.countDocuments(),
    matches: await MatchModel.countDocuments(),
    predictions: await PredictionModel.countDocuments(),
    groupStandings: await GroupStandingModel.countDocuments(),
    knockoutSlots: await KnockoutSlotModel.countDocuments(),
    matchDisciplines: await MatchDisciplineModel.countDocuments(),
    bestThirdOverrides: await BestThirdOverrideModel.countDocuments(),
    userRankings: await UserRankingModel.countDocuments(),
    auditLogs: await AuditLogModel.countDocuments()
  }

  const [
    teams,
    matches,
    predictions,
    groupStandings,
    knockoutSlots,
    matchDisciplines,
    bestThirdOverrides,
    userRankings,
    auditLogs
  ] = await Promise.all([
    TeamModel.deleteMany({}),
    MatchModel.deleteMany({}),
    PredictionModel.deleteMany({}),
    GroupStandingModel.deleteMany({}),
    KnockoutSlotModel.deleteMany({}),
    MatchDisciplineModel.deleteMany({}),
    BestThirdOverrideModel.deleteMany({}),
    UserRankingModel.deleteMany({}),
    AuditLogModel.deleteMany({})
  ])

  const deleted = {
    teams: teams.deletedCount,
    matches: matches.deletedCount,
    predictions: predictions.deletedCount,
    groupStandings: groupStandings.deletedCount,
    knockoutSlots: knockoutSlots.deletedCount,
    matchDisciplines: matchDisciplines.deletedCount,
    bestThirdOverrides: bestThirdOverrides.deletedCount,
    userRankings: userRankings.deletedCount,
    auditLogs: auditLogs.deletedCount
  }

  await createAuditLog(event, {
    userId: admin.id,
    action: 'TOURNAMENT_DATA_RESET',
    entity: 'Tournament',
    before,
    after: {
      deleted,
      usersPreserved: true
    }
  })

  return {
    ok: true,
    deleted,
    usersPreserved: true
  }
})
