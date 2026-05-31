import { knockoutBracketService } from '../../services/KnockoutBracketService'

export default defineEventHandler(async () => {
  return knockoutBracketService.getBracket()
})
