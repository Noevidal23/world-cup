import mongoose from 'mongoose'
import { KnockoutSlotModel } from '../../../../../models/KnockoutSlot'
import { knockoutBracketService } from '../../../../../services/KnockoutBracketService'
import { requireAdminUser } from '../../../../../utils/auth'
import { createAuditLog } from '../../../../../utils/audit'
import { serializeKnockoutSlot } from '../../../../../utils/knockout'
import { manualKnockoutOverrideSchema } from '../../../../../validators/knockout'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !mongoose.isValidObjectId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Slot invalido'
    })
  }

  const parsed = manualKnockoutOverrideSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Override invalido',
      data: parsed.error.flatten()
    })
  }

  try {
    const existing = await KnockoutSlotModel.findById(id).populate('teamId')
    const before = existing ? serializeKnockoutSlot(existing) : undefined
    const slot = await knockoutBracketService.applyManualOverride(id, parsed.data.teamId, parsed.data.overrideReason)
    await slot.populate('teamId')

    await createAuditLog(event, {
      userId: admin.id,
      action: 'KNOCKOUT_SLOT_MANUAL_OVERRIDE',
      entity: 'KnockoutSlot',
      entityId: slot._id,
      before,
      after: {
        matchNumber: slot.matchNumber,
        slot: slot.slot,
        teamId: parsed.data.teamId,
        overrideReason: parsed.data.overrideReason
      }
    })

    return {
      slot: serializeKnockoutSlot(slot)
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'No se pudo aplicar el override'
    })
  }
})
