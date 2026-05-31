import { z } from 'zod'

export const tournamentResetConfirmation = 'REINICIAR TORNEO'

export const tournamentResetSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
  confirmation: z.string().trim().refine(value => value === tournamentResetConfirmation, {
    message: `Escribe ${tournamentResetConfirmation} para confirmar`
  })
})

export type TournamentResetInput = z.infer<typeof tournamentResetSchema>
