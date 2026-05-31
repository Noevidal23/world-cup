import { bestThirdsService } from '../../services/BestThirdsService'

export default defineEventHandler(async () => {
  const thirds = await bestThirdsService.getBestThirds()

  return {
    thirds
  }
})
