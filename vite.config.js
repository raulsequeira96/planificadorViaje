import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import CryptoJS from 'crypto-js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cryptoSeed = process.env.TRIP_CRYPTO_SEED || 'dev-seed-change-me'
const authUsername = (process.env.TRIP_AUTH_USERNAME || '').trim().toLowerCase()
const authPassword = process.env.TRIP_AUTH_PASSWORD || ''

if (!authUsername || !authPassword) {
  throw new Error('Debes definir TRIP_AUTH_USERNAME y TRIP_AUTH_PASSWORD para generar el build.')
}

function deriveKey(password, seed) {
  return CryptoJS.PBKDF2(password, seed, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString()
}

const authUserHash = CryptoJS.SHA256(`${authUsername}:${cryptoSeed}`).toString()
const authProof = CryptoJS.AES.encrypt(
  JSON.stringify({ ok: true, u: authUsername }),
  deriveKey(authPassword, cryptoSeed)
).toString()
const emptyLocalVaultPayload = {
  app: 'trip-planner',
  version: 1,
  note: 'Reemplaza este archivo por el exportado desde la app (shared-vault.json).',
  vaultCipher: '',
  authCheckCipher: null
}

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const localSharedVaultPath = path.join(projectRoot, 'public', 'shared-vault.json')

function parseBasicAuth(headerValue) {
  if (!headerValue || !headerValue.toLowerCase().startsWith('basic ')) return null
  const encoded = headerValue.slice(6).trim()
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  const idx = decoded.indexOf(':')
  if (idx <= 0) return null
  return {
    username: decoded.slice(0, idx).trim().toLowerCase(),
    password: decoded.slice(idx + 1)
  }
}

function isAuthorized(headerValue) {
  const creds = parseBasicAuth(headerValue)
  if (!creds) return false
  return creds.username === authUsername && creds.password === authPassword
}

function localVaultSyncPlugin() {
  return {
    name: 'local-vault-sync',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/vault-sync', async (req, res) => {
        if (!isAuthorized(req.headers.authorization || '')) {
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Unauthorized' }))
          return
        }

        if (req.method === 'GET') {
          try {
            const raw = await fs.readFile(localSharedVaultPath, 'utf8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(raw)
          } catch {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Not found' }))
          }
          return
        }

        if (req.method === 'POST') {
          const chunks = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', async () => {
            try {
              const bodyText = Buffer.concat(chunks).toString('utf8')
              const parsed = JSON.parse(bodyText)
              if (typeof parsed?.vaultCipher !== 'string' || !parsed.vaultCipher) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Invalid payload' }))
                return
              }

              const payload = {
                app: 'trip-planner',
                version: parsed.version || 1,
                updatedAt: new Date().toISOString(),
                vaultCipher: parsed.vaultCipher,
                authCheckCipher: parsed.authCheckCipher || null
              }

              await fs.writeFile(localSharedVaultPath, JSON.stringify(payload, null, 2), 'utf8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, updatedAt: payload.updatedAt }))
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid JSON' }))
            }
          })
          return
        }

        if (req.method === 'DELETE') {
          await fs.writeFile(localSharedVaultPath, JSON.stringify(emptyLocalVaultPayload, null, 2), 'utf8')
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, deletedAt: new Date().toISOString() }))
          return
        }

        res.statusCode = 405
        res.setHeader('Allow', 'GET, POST, DELETE')
        res.end()
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    localVaultSyncPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['iconoDeApp.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Itinerario — Planificador de viaje',
        short_name: 'Itinerario',
        description: 'Planificador de viaje con calendario, eventos y presupuesto, cifrado y disponible offline.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4ede1',
        theme_color: '#a8453f',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // El vault se sincroniza vía fetch propio (crypto.js) con manejo de errores offline;
        // no lo precacheamos para que siempre pida la versión más nueva cuando hay red.
        globIgnores: ['shared-vault.json'],
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  define: {
    // La semilla se inyecta en build time desde la variable de entorno TRIP_CRYPTO_SEED
    __CRYPTO_SEED__: JSON.stringify(cryptoSeed),
    __AUTH_USER_HASH__: JSON.stringify(authUserHash),
    __AUTH_PROOF__: JSON.stringify(authProof)
  }
})
