import { readFile } from 'node:fs/promises'
import mongoose from 'mongoose'
import { importWorldCupSchedule } from '../server/services/worldcupImport'
import { loadEnvFile } from './utils/load-env'

loadEnvFile()
const [, , filePath] = process.argv

if (!filePath) {
  console.error('Usage: tsx scripts/import-worldcup.ts <calendar.json>')
  process.exit(1)
}

const mongodbUri = process.env.MONGODB_URI

if (!mongodbUri) {
  console.error('MONGODB_URI is required')
  process.exit(1)
}

const run = async () => {
  const file = await readFile(filePath, 'utf8')
  const payload = JSON.parse(file)

  await mongoose.connect(mongodbUri)

  const result = await importWorldCupSchedule(payload, {
    source: `script:${filePath}`,
    connect: async () => mongoose
  })

  console.log(JSON.stringify(result, null, 2))
  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error)
  await mongoose.disconnect()
  process.exit(1)
})
