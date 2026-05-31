import { rankingService } from '../services/RankingService'

export default defineEventHandler(async () => {
  const ranking = await rankingService.getRanking()

  return {
    ranking
  }
})
