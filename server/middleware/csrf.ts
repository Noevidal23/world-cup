const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  const method = event.method.toUpperCase()

  if (SAFE_METHODS.has(method)) {
    return
  }

  const host = getHeader(event, 'host')
  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')

  if (!host || (!origin && !referer)) {
    return
  }

  const allowedOrigin = `http${process.env.NODE_ENV === 'production' ? 's' : ''}://${host}`
  const source = origin || referer

  if (source && !source.startsWith(allowedOrigin)) {
    throw createError({
      statusCode: 403,
      message: 'Origen no permitido'
    })
  }
})
