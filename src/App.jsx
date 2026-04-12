import { useState, useEffect, useRef, useCallback } from 'react'
import AuthScreen from './components/AuthScreen'
import Calendar from './components/Calendar'
import SidePanel from './components/SidePanel'
import DayModal from './components/DayModal'
import ToastContainer from './components/Toast'
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

let toastIdCounter = 0

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
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', opts = {}) => {
    const id = ++toastIdCounter
    setToasts((prev) => [...prev, { id, message, type, duration: opts.duration || 3000, undoAction: opts.undoAction || null }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

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

  function editDestination(id, changes) {
    setData({
      ...data,
      destinations: data.destinations.map((d) => d.id === id ? { ...d, ...changes } : d)
    })
  }

  function deleteDestination(id) {
    if (!confirm('¿Eliminar destino? Los eventos asociados a sus fechas no se borran.')) return
    setData({ ...data, destinations: data.destinations.filter((d) => d.id !== id) })
    if (selectedDestinationId === id) setSelectedDestinationId(null)
  }

  function clearDestinations() {
    const backup = data.destinations
    setData({ ...data, destinations: [] })
    setSelectedDestinationId(null)
    showToast('Todos los destinos eliminados', 'success', {
      duration: 2000,
      undoAction: () => {
        setData((prev) => ({ ...prev, destinations: backup }))
        showToast('Destinos restaurados', 'success')
      }
    })
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
      showToast('No se pudo borrar el vault remoto', 'error')
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
      showToast('Todavia no hay datos para exportar', 'error')
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
    showToast('Backup descargado como shared-vault.json', 'success')
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
      showToast('Backup importado correctamente', 'success')
    } catch {
      showToast('No se pudo importar el JSON cifrado', 'error')
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
      showToast('Sincronizacion completada', 'success')
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
        showToast('Sincronizacion completada desde el servidor remoto', 'success')
        return
      }
      // remoteBackup es null → 404: no hay vault en el servidor
      showToast('No hay vault almacenado en el servidor remoto todavia', 'info')
      return
    } catch {
      apiFetchFailed = true
    }

    // Fallback: archivo estatico solo en desarrollo
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
          showToast('Sincronizacion completada desde shared-vault.json', 'success')
          return
        } catch {
          showToast('El vault remoto no coincide con tus credenciales', 'error')
          return
        }
      }
    }

    showToast('No se pudo conectar con el servidor remoto. Verifica tu conexion y configuracion de Netlify.', 'error', { duration: 5000 })
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
          onEditDestination={editDestination}
          onClearDestinations={clearDestinations}
          showToast={showToast}
        />
      </main>

      {selectedDate && (
        <DayModal
          date={selectedDate}
          events={selectedEvents}
          onClose={() => setSelectedDate(null)}
          onSaveEvent={saveEvent}
          onDeleteEvent={deleteEvent}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
