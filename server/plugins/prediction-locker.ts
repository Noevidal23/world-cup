import { predictionLockService } from '../services/PredictionLockService'

const lockIntervalMs = 60_000

declare global {
  var predictionLockInterval: NodeJS.Timeout | undefined
  var predictionLockInFlight: Promise<unknown> | undefined
}

const runAutoLock = (source: string) => {
  if (globalThis.predictionLockInFlight) {
    return
  }

  globalThis.predictionLockInFlight = predictionLockService.lockStartedMatches({ source })
    .catch((error) => {
      console.error(JSON.stringify({
        level: 'error',
        message: 'No se pudieron bloquear pronósticos automáticamente',
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        timestamp: new Date().toISOString()
      }))
    })
    .finally(() => {
      globalThis.predictionLockInFlight = undefined
    })
}

export default defineNitroPlugin(() => {
  runAutoLock('server-start')

  if (globalThis.predictionLockInterval) {
    return
  }

  globalThis.predictionLockInterval = setInterval(() => {
    runAutoLock('server-interval')
  }, lockIntervalMs)

  globalThis.predictionLockInterval.unref?.()
})
