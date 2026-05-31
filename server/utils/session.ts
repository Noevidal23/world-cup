import { createHmac, timingSafeEqual } from 'node:crypto'
import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'

const AUTH_COOKIE = 'wc_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

interface SessionPayload {
  userId: string
  expiresAt: number
}

const getSessionSecret = () => {
  const config = useRuntimeConfig()

  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Session secret is not configured'
    })
  }

  return config.sessionSecret
}

const sign = (value: string) => createHmac('sha256', getSessionSecret()).update(value).digest('base64url')

const encodePayload = (payload: SessionPayload) => Buffer.from(JSON.stringify(payload)).toString('base64url')

const decodePayload = (value: string): SessionPayload | null => {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionPayload
  } catch {
    return null
  }
}

const signaturesMatch = (actual: string, expected: string) => {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

export const setAuthSession = (event: H3Event, userId: string) => {
  const payload = encodePayload({
    userId,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
  })
  const token = `${payload}.${sign(payload)}`

  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  })
}

export const clearAuthSession = (event: H3Event) => {
  deleteCookie(event, AUTH_COOKIE, {
    path: '/'
  })
}

export const getAuthSession = (event: H3Event): SessionPayload | null => {
  const token = getCookie(event, AUTH_COOKIE)

  if (!token) {
    return null
  }

  const [payload, signature] = token.split('.')

  if (!payload || !signature || !signaturesMatch(signature, sign(payload))) {
    return null
  }

  const session = decodePayload(payload)

  if (!session || session.expiresAt <= Date.now()) {
    clearAuthSession(event)
    return null
  }

  return session
}
