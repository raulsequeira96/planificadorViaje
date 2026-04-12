import { useState } from 'react'
import {
  fetchRemoteVaultBackupJson,
  hasVault,
  hydrateVaultFromHostedJson,
  importVaultBackupJson,
  loadVault,
  saveVault,
  verifyFixedCredentials,
  wipeVault
} from '../lib/crypto'

export default function AuthScreen({ onUnlock }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const canUseStaticFallback = import.meta.env.DEV

  function createFreshVault(unlockPassword) {
    const emptyData = { destinations: [], events: [] }
    saveVault(emptyData, unlockPassword)
    onUnlock({ username, password: unlockPassword }, emptyData)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!verifyFixedCredentials(username, password)) {
      setError('Usuario o contraseña incorrectos')
      return
    }

    try {
      const remoteBackup = await fetchRemoteVaultBackupJson(username, password)
      if (remoteBackup?.rawJson) importVaultBackupJson(remoteBackup.rawJson)
    } catch {
      // Si no hay endpoint remoto disponible, se usa el flujo local actual.
    }

    if (!hasVault()) {
      if (!canUseStaticFallback) {
        createFreshVault(password)
        return
      }

      const restoredFromHostedJson = await hydrateVaultFromHostedJson()
      if (!restoredFromHostedJson) {
        createFreshVault(password)
        return
      }
    }

    try {
      const data = loadVault(password)
      if (!data) {
        createFreshVault(password)
        return
      }
      onUnlock({ username, password }, data)
    } catch (err) {
      const shouldReset = confirm(
        'El vault actual fue cifrado con otras credenciales o semilla. Si continuás, se borrará para crear uno nuevo con este usuario y contraseña. ¿Querés continuar?'
      )
      if (!shouldReset) {
        setError('No se pudo descifrar el vault con esas credenciales')
        return
      }
      wipeVault()
      createFreshVault(password)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">Itinerario</div>
        <div className="auth-tagline">Planificador de viaje cifrado</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              placeholder="Tu usuario"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Iniciar sesión
            </button>
          </div>

          <div className="auth-hint">
            Credenciales de acceso definidas en build.
          </div>
        </form>
      </div>
    </div>
  )
}
