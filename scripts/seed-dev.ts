import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { MatchModel } from '../server/models/Match'
import { TeamModel } from '../server/models/Team'
import { UserModel } from '../server/models/User'
import { loadEnvFile } from './utils/load-env'

loadEnvFile()
const mongodbUri = process.env.MONGODB_URI

if (!mongodbUri) {
  console.error('MONGODB_URI is required')
  process.exit(1)
}

const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin'
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!'

const teams = [
  { fifaCode: 'MEX', name: 'México', group: 'A' },
  { fifaCode: 'CAN', name: 'Canadá', group: 'A' },
  { fifaCode: 'USA', name: 'Estados Unidos', group: 'B' },
  { fifaCode: 'BRA', name: 'Brasil', group: 'B' }
]

const run = async () => {
  await mongoose.connect(mongodbUri)

  const admin = await UserModel.findOneAndUpdate(
    { username: adminUsername.toLowerCase() },
    {
      name: 'Administrador',
      username: adminUsername.toLowerCase(),
      email: adminEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'admin',
      status: 'active'
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  )

  const teamDocs = new Map<string, Awaited<ReturnType<typeof TeamModel.findOneAndUpdate>>>()

  for (const team of teams) {
    const doc = await TeamModel.findOneAndUpdate(
      { fifaCode: team.fifaCode },
      team,
      { upsert: true, returnDocument: 'after', runValidators: true }
    )

    teamDocs.set(team.fifaCode, doc)
  }

  const kickoffBase = new Date()
  kickoffBase.setDate(kickoffBase.getDate() + 1)
  kickoffBase.setHours(18, 0, 0, 0)

  const demoMatches = [
    {
      externalId: 'seed-1',
      matchNumber: 1,
      stage: 'group',
      group: 'A',
      homeTeamId: teamDocs.get('MEX')?._id,
      awayTeamId: teamDocs.get('CAN')?._id,
      kickoffAt: kickoffBase,
      stadium: 'Estadio Azteca',
      city: 'Ciudad de México'
    },
    {
      externalId: 'seed-2',
      matchNumber: 2,
      stage: 'group',
      group: 'B',
      homeTeamId: teamDocs.get('USA')?._id,
      awayTeamId: teamDocs.get('BRA')?._id,
      kickoffAt: new Date(kickoffBase.getTime() + 24 * 60 * 60 * 1000),
      stadium: 'MetLife Stadium',
      city: 'New York/New Jersey'
    }
  ]

  for (const match of demoMatches) {
    await MatchModel.findOneAndUpdate(
      { externalId: match.externalId },
      {
        ...match,
        status: 'scheduled',
        predictionsLocked: false,
        scoringMode: 'regular_time'
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    )
  }

  console.log(JSON.stringify({
    ok: true,
    admin: {
      id: String(admin._id),
      username: admin.username,
      email: admin.email,
      password: adminPassword
    },
    teams: teams.length,
    matches: demoMatches.length
  }, null, 2))

  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error)
  await mongoose.disconnect()
  process.exit(1)
})
