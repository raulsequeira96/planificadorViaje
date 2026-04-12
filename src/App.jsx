import { useState, useEffect, useRef } from 'react'
import AuthScreen from './components/AuthScreen'
import Calendar from './components/Calendar'
import SidePanel from './components/SidePanel'
import DayModal from './components/DayModal'
import {
  clearRemoteVaultBackup,
  extractBackupTimestamp,
  exportVaultBackupJson,
  fetchRemoteVaultBackupJson,
  hydrateVaultFromHostedJson,
  importVaultBackupJson,
  loadVault,
  pushRemoteVaultBackupJson,
  saveVault,
  wipeVault
} from './lib/crypto'

export default function App() {
  const [auth, setAuth] = useState(null)
  const [data, setData] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDestinationId, setSelectedDestinationId] = useState(null)
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false)
  const backupInputRef = useRef(null)
  const [syncState, setSyncState] = useState('idle')
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const canUseStaticFallback = import.meta.env.DEV
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Auto-guardado cifrado ante cualquier cambio de data
  useEffect(() => {
    if (!auth || !data) return

    saveVault(data, auth.password)

    const syncNow = async () => {
      setSyncState('syncing')
      try {
        const result = await pushRemoteVaultBackupJson(auth.username, auth.password)
        if (result?.timestamp) setLastSyncAt(result.timestamp)
        setSyncState('ok')
      } catch {
        setSyncState('error')
      }
    }

    syncNow()
  }, [data, auth])

  if (!auth || !data) {
    return <AuthScreen onUnlock={(sessionAuth, d) => { setAuth(sessionAuth); setData(d) }} />
  }

  function addDestination(dest) {
    setData({ ...data, destinations: [...data.destinations, dest] })
    setSelectedDestinationId(dest.id)
  }

  function deleteDestination(id) {
    if (!confirm('¿Eliminar destino? Los eventos asociados a sus fechas no se borran.')) return
    setData({ ...data, destinations: data.destinations.filter((d) => d.id !== id) })
    if (selectedDestinationId === id) setSelectedDestinationId(null)
  }

  function saveEvent(event) {
    const exists = data.events.find((e) => e.id === event.id)
    const events = exists
      ? data.events.map((e) => e.id === event.id ? event : e)
      : [...data.events, event]
    setData({ ...data, events })
  }

  function deleteEvent(id) {
    if (!confirm('¿Eliminar este evento?')) return
    setData({ ...data, events: data.events.filter((e) => e.id !== id) })
  }

  function lock() {
    setIsMobileActionsOpen(false)
    setAuth(null)
    setData(null)
    setSelectedDestinationId(null)
    setSyncState('idle')
    setLastSyncAt(null)
  }

  async function resetAll() {
    if (!confirm('Esto borra todos los datos cifrados de este dispositivo. ¿Continuar?')) return
    setIsMobileActionsOpen(false)

    setSyncState('syncing')
    try {
      await clearRemoteVaultBackup(auth.username, auth.password)
    } catch {
      setSyncState('error')
      alert('No se pudo borrar el vault remoto. No se borró nada local para evitar inconsistencias.')
      return
    }

    wipeVault()
    setAuth(null)
    setData(null)
    setSelectedDestinationId(null)
    setSyncState('idle')
    setLastSyncAt(null)
  }

  function toggleTheme() {
    setIsMobileActionsOpen(false)
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  function exportEncryptedJson() {
    setIsMobileActionsOpen(false)
    const backupJson = exportVaultBackupJson()
    if (!backupJson) {
      alert('Todavia no hay datos para exportar.')
      return
    }

    const blob = new Blob([backupJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shared-vault.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    alert('Descargado como shared-vault.json. Subilo a public/shared-vault.json y redeploy para compartirlo en otros celulares.')
  }

  function requestImportEncryptedJson() {
    setIsMobileActionsOpen(false)
    backupInputRef.current?.click()
  }

  async function handleImportEncryptedJson(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const shouldImport = confirm('Esto reemplazara el vault actual por el del archivo seleccionado. Queres continuar?')
    if (!shouldImport) {
      e.target.value = ''
      return
    }

    try {
      const rawJson = await file.text()
      importVaultBackupJson(rawJson)
      const importedTimestamp = extractBackupTimestamp(rawJson)
      if (importedTimestamp) setLastSyncAt(importedTimestamp)
      const importedData = loadVault(auth.password)
      if (!importedData) throw new Error('Vault vacio')
      setData(importedData)
      setSelectedDestinationId(null)
      setSelectedDate(null)
      alert('Backup cifrado importado correctamente.')
    } catch {
      alert('No se pudo importar el JSON cifrado. Verifica usuario, contrasena y semilla del build.')
    } finally {
      e.target.value = ''
    }
  }

  async function syncFromHostedJson() {
    setIsMobileActionsOpen(false)
    setSyncState('syncing')

    try {
      const pushed = await pushRemoteVaultBackupJson(auth.username, auth.password)
      if (pushed?.timestamp) setLastSyncAt(pushed.timestamp)
      setSyncState('ok')
      alert('Sincronizacion completada. Se subio tu version local al remoto.')
      return
    } catch {
      setSyncState('error')
      const shouldLoadRemote = confirm(
        'No se pudo subir tu version local al remoto. Queres intentar cargar la version remota?'
      )
      if (!shouldLoadRemote) {
        return
      }
    }

    let apiFetchFailed = false
    try {
      const remoteBackup = await fetchRemoteVaultBackupJson(auth.username, auth.password)
      if (remoteBackup) {
        importVaultBackupJson(remoteBackup.rawJson)
        if (remoteBackup.timestamp) setLastSyncAt(remoteBackup.timestamp)
        const syncedData = loadVault(auth.password)
        if (!syncedData) throw new Error('Vault vacio')
        setData(syncedData)
        setSelectedDestinationId(null)
        setSelectedDate(null)
        setSyncState('ok')
        alert('Sincronizacion completada desde el servidor remoto.')
        return
      }
      // remoteBackup es null → 404: no hay vault en el servidor
      alert('No hay vault almacenado en el servidor remoto todavia. Cuando la conexion funcione, tu version local se subira automaticamente.')
      return
    } catch {
      apiFetchFailed = true
    }

    // Fallback: archivo estático solo en desarrollo
    if (canUseStaticFallback) {
      const imported = await hydrateVaultFromHostedJson()
      if (imported) {
        if (imported.timestamp) setLastSyncAt(imported.timestamp)
        try {
          const syncedData = loadVault(auth.password)
          if (!syncedData) throw new Error('Vault vacio')
          setData(syncedData)
          setSelectedDestinationId(null)
          setSelectedDate(null)
          alert('Sincronizacion completada desde shared-vault.json')
          return
        } catch {
          alert('El vault remoto no coincide con tus credenciales o semilla del build.')
          return
        }
      }
    }

    alert('No se pudo conectar con el servidor remoto. Verifica tu conexion a internet y que el sitio este desplegado correctamente en Netlify con las variables de entorno TRIP_AUTH_USERNAME y TRIP_AUTH_PASSWORD configuradas.')
  }

  const selectedEvents = selectedDate
    ? data.events.filter((e) => e.date === selectedDate)
    : []
  const formattedLastSyncAt = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    : null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Itinerario</h1>
          <div className="subtitle">Planificador de viaje</div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-ghost mobile-actions-toggle"
            onClick={() => setIsMobileActionsOpen((open) => !open)}
            aria-expanded={isMobileActionsOpen}
          >
            {isMobileActionsOpen ? 'Cerrar acciones' : 'Abrir acciones'}
          </button>

          <div className={`header-actions-menu ${isMobileActionsOpen ? 'open' : ''}`}>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleImportEncryptedJson}
            />
            <button className="btn btn-ghost" onClick={exportEncryptedJson}>⬇ shared-vault.json</button>
            <button className="btn btn-ghost" onClick={requestImportEncryptedJson}>⬆ Importar JSON</button>
            <button className="btn btn-ghost" onClick={syncFromHostedJson}>⟳ Sincronizar (subir local)</button>
            <div className={`sync-badge ${syncState}`}>
              <span>{syncState === 'syncing' ? 'Sincronizando...' : syncState === 'ok' ? 'Sincronizado' : syncState === 'error' ? 'Sin sync remoto' : 'Sincronizacion inactiva'}</span>
              <span className="sync-time">{formattedLastSyncAt ? `Ultima sync: ${formattedLastSyncAt}` : 'Ultima sync: -'}</span>
            </div>
            <button className="btn btn-ghost theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Modo oscuro' : '☀️ Modo claro'}
            </button>
            <button className="btn btn-ghost" onClick={lock}>🔒 Bloquear</button>
            <button className="btn btn-danger" onClick={resetAll}>Borrar todo</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Calendar
          destinations={data.destinations}
          events={data.events}
          selectedDestinationId={selectedDestinationId}
          onDayClick={setSelectedDate}
        />
        <SidePanel
          destinations={data.destinations}
          events={data.events}
          selectedDestinationId={selectedDestinationId}
          onSelectDestination={setSelectedDestinationId}
          onAddDestination={addDestination}
          onDeleteDestination={deleteDestination}
        />
      </main>

      {selectedDate && (
        <DayModal
          date={selectedDate}
          events={selectedEvents}
          onClose={() => setSelectedDate(null)}
          onSaveEvent={saveEvent}
          onDeleteEvent={deleteEvent}
        />
      )}
    </div>
  )
}
