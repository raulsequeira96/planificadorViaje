import crypto from 'node:crypto'
import { getStore } from '@netlify/blobs'

const STORE_NAME = 'trip-planner'
const STORE_KEY = 'shared-vault'

function normalizeUsername(username) {
  return (username || '').trim().toLowerCase()
}

function parseBasicAuth(headerValue) {
  if (!headerValue || !headerValue.toLowerCase().startsWith('basic ')) return null
  const encoded = headerValue.slice(6).trim()
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  const idx = decoded.indexOf(':')
  if (idx <= 0) return null
  return {
    username: normalizeUsername(decoded.slice(0, idx)),
    password: decoded.slice(idx + 1)
  }
}

function timingSafeEquals(a, b) {
  const aBuf = Buffer.from(a || '', 'utf8')
  const bBuf = Buffer.from(b || '', 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function response(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(bodyObj)
  }
}

function parseBody(event) {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || ''
  return JSON.parse(rawBody || '{}')
}

export async function handler(event) {
  const expectedUsername = normalizeUsername(process.env.TRIP_AUTH_USERNAME || '')
  const expectedPassword = process.env.TRIP_AUTH_PASSWORD || ''

  if (!expectedUsername || !expectedPassword) {
    return response(500, { error: 'Server auth not configured' })
  }

  const creds = parseBasicAuth(event.headers.authorization || event.headers.Authorization)
  const isAuthorized =
    !!creds &&
    timingSafeEquals(creds.username, expectedUsername) &&
    timingSafeEquals(creds.password, expectedPassword)

  if (!isAuthorized) {
    return {
      ...response(401, { error: 'Unauthorized' }),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'WWW-Authenticate': 'Basic realm="Trip Planner"'
      }
    }
  }

  const store = getStore(STORE_NAME)

  if (event.httpMethod === 'GET') {
    const payload = await store.get(STORE_KEY, { type: 'json' })
    if (!payload) return response(404, { error: 'Not found' })
    return response(200, payload)
  }

  if (event.httpMethod === 'POST') {
    let parsed
    try {
      parsed = parseBody(event)
    } catch {
      return response(400, { error: 'Invalid JSON body' })
    }

    if (typeof parsed?.vaultCipher !== 'string' || !parsed.vaultCipher) {
      return response(400, { error: 'Invalid payload' })
    }

    const payload = {
      app: 'trip-planner',
      version: parsed.version || 1,
      updatedAt: new Date().toISOString(),
      vaultCipher: parsed.vaultCipher,
      authCheckCipher: parsed.authCheckCipher || null
    }

    await store.setJSON(STORE_KEY, payload)
    return response(200, { ok: true, updatedAt: payload.updatedAt })
  }

  if (event.httpMethod === 'DELETE') {
    await store.delete(STORE_KEY)
    return response(200, { ok: true, deletedAt: new Date().toISOString() })
  }

  return {
    statusCode: 405,
    headers: { Allow: 'GET, POST, DELETE' },
    body: ''
  }
}
