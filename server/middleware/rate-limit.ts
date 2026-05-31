import { assertRateLimit } from '../utils/rateLimit'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  const path = event.path || ''
  const method = event.method.toUpperCase()

  if (SAFE_METHODS.has(method)) {
    return
  }

  if (!path.startsWith('/api/admin') && !path.startsWith('/api/users')) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'

  assertRateLimit(`mutate:${ip}:${path}`, {
    limit: 60,
    windowMs: 60 * 1000
  })
})
