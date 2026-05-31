import { createAuditLog } from '../../utils/audit'
import { clearAuthSession, getAuthSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = getAuthSession(event)

  clearAuthSession(event)

  if (session) {
    await createAuditLog(event, {
      userId: session.userId,
      action: 'AUTH_LOGOUT',
      entity: 'AuthSession',
      entityId: session.userId
    })
  }

  return {
    ok: true
  }
})
