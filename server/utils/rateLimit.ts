interface RateLimitEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

export const assertRateLimit = (
  key: string,
  options: { limit: number, windowMs: number }
) => {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    })
    return
  }

  current.count++

  if (current.count > options.limit) {
    throw createError({
      statusCode: 429,
      message: 'Demasiados intentos. Intenta de nuevo más tarde.'
    })
  }
}

export const clearRateLimit = (key: string) => {
  buckets.delete(key)
}
