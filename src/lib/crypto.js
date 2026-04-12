import CryptoJS from 'crypto-js'

// La semilla se inyecta en build time (ver vite.config.js).
// Se combina con la contraseña del usuario para derivar la clave real.
const BUILD_SEED = typeof __CRYPTO_SEED__ !== 'undefined' ? __CRYPTO_SEED__ : 'dev-seed-change-me'
const AUTH_USER_HASH = typeof __AUTH_USER_HASH__ !== 'undefined' ? __AUTH_USER_HASH__ : ''
const AUTH_PROOF = typeof __AUTH_PROOF__ !== 'undefined' ? __AUTH_PROOF__ : ''

const STORAGE_KEY = 'trip-planner-vault'
const AUTH_CHECK_KEY = 'trip-planner-auth-check'
const BACKUP_VERSION = 1
const HOSTED_BACKUP_PATH = '/shared-vault.json'
const REMOTE_SYNC_PATH = '/api/vault-sync'

function normalizeUsername(username) {
  return (username || '').trim().toLowerCase()
}

function deriveKey(password) {
  // PBKDF2 con la semilla como salt (constante por build).
  return CryptoJS.PBKDF2(password, BUILD_SEED, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString()
}

export function encrypt(data, password) {
  const key = deriveKey(password)
  const json = JSON.stringify(data)
  return CryptoJS.AES.encrypt(json, key).toString()
}

export function decrypt(ciphertext, password) {
  const key = deriveKey(password)
  const bytes = CryptoJS.AES.decrypt(ciphertext, key)
  const text = bytes.toString(CryptoJS.enc.Utf8)
  if (!text) throw new Error('Contraseña incorrecta o datos corruptos')
  return JSON.parse(text)
}

export function saveVault(data, password) {
  const cipher = encrypt(data, password)
  localStorage.setItem(STORAGE_KEY, cipher)
  // Guardo un check para validar la contraseña en próximos logins
  const check = encrypt({ ok: true, ts: Date.now() }, password)
  localStorage.setItem(AUTH_CHECK_KEY, check)
}

export function loadVault(password) {
  const cipher = localStorage.getItem(STORAGE_KEY)
  if (!cipher) return null
  return decrypt(cipher, password)
}

export function hasVault() {
  return !!localStorage.getItem(STORAGE_KEY)
}

export function verifyPassword(password) {
  const check = localStorage.getItem(AUTH_CHECK_KEY)
  if (!check) return true // primera vez, cualquier contraseña es válida
  try {
    decrypt(check, password)
    return true
  } catch {
    return false
  }
}

export function verifyFixedCredentials(username, password) {
  const normalizedUsername = normalizeUsername(username)
  if (!normalizedUsername || !password) return false
  if (!AUTH_USER_HASH || !AUTH_PROOF) return false

  const userHash = CryptoJS.SHA256(`${normalizedUsername}:${BUILD_SEED}`).toString()
  if (userHash !== AUTH_USER_HASH) return false

  try {
    const proof = decrypt(AUTH_PROOF, password)
    return proof?.ok === true && proof?.u === normalizedUsername
  } catch {
    return false
  }
}

export function exportVaultBackupJson() {
  const vaultCipher = localStorage.getItem(STORAGE_KEY)
  if (!vaultCipher) return null

  const authCheckCipher = localStorage.getItem(AUTH_CHECK_KEY)
  return JSON.stringify(
    {
      app: 'trip-planner',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      vaultCipher,
      authCheckCipher: authCheckCipher || null
    },
    null,
    2
  )
}

export function extractBackupTimestamp(rawJson) {
  try {
    const parsed = JSON.parse(rawJson)
    if (typeof parsed?.updatedAt === 'string' && parsed.updatedAt) return parsed.updatedAt
    if (typeof parsed?.exportedAt === 'string' && parsed.exportedAt) return parsed.exportedAt
    return null
  } catch {
    return null
  }
}

function buildAuthHeader(username, password) {
  return `Basic ${btoa(`${username}:${password}`)}`
}

export async function fetchRemoteVaultBackupJson(username, password) {
  const res = await fetch(REMOTE_SYNC_PATH, {
    method: 'GET',
    headers: {
      Authorization: buildAuthHeader(username, password)
    },
    cache: 'no-store'
  })

  if (res.status === 404) return null
  if (!res.ok) throw new Error('No se pudo leer el vault remoto')
  const rawJson = await res.text()
  return {
    rawJson,
    timestamp: extractBackupTimestamp(rawJson)
  }
}

export async function pushRemoteVaultBackupJson(username, password) {
  const backupJson = exportVaultBackupJson()
  if (!backupJson) return false

  const parsed = JSON.parse(backupJson)
  const res = await fetch(REMOTE_SYNC_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: buildAuthHeader(username, password)
    },
    body: JSON.stringify({
      app: parsed.app,
      version: parsed.version,
      exportedAt: parsed.exportedAt,
      vaultCipher: parsed.vaultCipher,
      authCheckCipher: parsed.authCheckCipher
    })
  })

  if (!res.ok) throw new Error('No se pudo actualizar el vault remoto')
  let responseJson = null
  try {
    responseJson = await res.json()
  } catch {
    responseJson = null
  }
  return {
    ok: true,
    timestamp: responseJson?.updatedAt || new Date().toISOString()
  }
}

export async function clearRemoteVaultBackup(username, password) {
  const res = await fetch(REMOTE_SYNC_PATH, {
    method: 'DELETE',
    headers: {
      Authorization: buildAuthHeader(username, password)
    }
  })

  if (res.status === 404) return true
  if (!res.ok) throw new Error('No se pudo borrar el vault remoto')
  return true
}

export function importVaultBackupJson(rawJson) {
  let parsed
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error('JSON invalido')
  }

  const vaultCipher = parsed?.vaultCipher || parsed?.vault || parsed?.cipher
  if (typeof vaultCipher !== 'string' || !vaultCipher.trim()) {
    throw new Error('Backup invalido')
  }

  localStorage.setItem(STORAGE_KEY, vaultCipher)
  const authCheckCipher = parsed?.authCheckCipher || parsed?.authCheck || parsed?.check
  if (typeof authCheckCipher === 'string' && authCheckCipher) {
    localStorage.setItem(AUTH_CHECK_KEY, authCheckCipher)
  } else {
    localStorage.removeItem(AUTH_CHECK_KEY)
  }
}

export async function hydrateVaultFromHostedJson(path = HOSTED_BACKUP_PATH) {
  try {
    const url = `${path}?v=${Date.now()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const rawJson = await res.text()
    importVaultBackupJson(rawJson)
    return {
      imported: true,
      timestamp: extractBackupTimestamp(rawJson)
    }
  } catch {
    return null
  }
}

const LOCAL_BACKUP_KEY = 'trip-planner-vault-backup'
const LOCAL_BACKUP_TS_KEY = 'trip-planner-vault-backup-ts'

export function snapshotLocalBackup() {
  const vault = localStorage.getItem(STORAGE_KEY)
  const authCheck = localStorage.getItem(AUTH_CHECK_KEY)
  if (!vault) return false
  localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({ vault, authCheck }))
  localStorage.setItem(LOCAL_BACKUP_TS_KEY, new Date().toISOString())
  return true
}

export function restoreLocalBackup() {
  const raw = localStorage.getItem(LOCAL_BACKUP_KEY)
  if (!raw) return false
  const { vault, authCheck } = JSON.parse(raw)
  if (!vault) return false
  localStorage.setItem(STORAGE_KEY, vault)
  if (authCheck) localStorage.setItem(AUTH_CHECK_KEY, authCheck)
  else localStorage.removeItem(AUTH_CHECK_KEY)
  return true
}

export function getLocalBackupTimestamp() {
  return localStorage.getItem(LOCAL_BACKUP_TS_KEY) || null
}

export function hasLocalBackup() {
  return !!localStorage.getItem(LOCAL_BACKUP_KEY)
}

export function wipeVault() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(AUTH_CHECK_KEY)
}
