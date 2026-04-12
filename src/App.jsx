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
  getLocalBackupTimestamp,
  hasLocalBackup,
  importVaultBackupJson,
  loadVault,
  pushRemoteVaultBackupJson,
  restoreLocalBackup,
  saveVault,
  snapshotLocalBackup,
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
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme === 'light' ? 'light' : 'dark'
  })
  const [toasts, setToasts] = useState([])
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [notificationEmail, setNotificationEmail] = useState(() => localStorage.getItem('trip-planner-email') || '')

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

  // Auto-guardado cifrado local ante cualquier cambio de data (sin push remoto)
  useEffect(() => {
    if (!auth || !data) return
    saveVault(data, auth.password)
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

  function saveEmail(email) {
    const trimmed = email.trim()
    if (trimmed) {
      localStorage.setItem('trip-planner-email', trimmed)
      setNotificationEmail(trimmed)
      showToast('Email guardado', 'success')
    } else {
      localStorage.removeItem('trip-planner-email')
      setNotificationEmail('')
      showToast('Email eliminado', 'info')
    }
    setShowEmailDialog(false)
    setIsMobileActionsOpen(false)
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

  // ─── Sync: subir local al servidor ───
  async function syncPushLocal() {
    setIsMobileActionsOpen(false)
    if (!confirm('Esto va a subir tu version local al servidor, reemplazando lo que haya en la nube. ¿Continuar?')) return

    setSyncState('syncing')
    try {
      const result = await pushRemoteVaultBackupJson(auth.username, auth.password)
      if (result?.timestamp) setLastSyncAt(result.timestamp)
      setSyncState('ok')
      showToast('Datos subidos a la nube correctamente', 'success')
    } catch (err) {
      setSyncState('error')
      showToast('No se pudo subir al servidor. Verifica tu conexion y que Netlify tenga las variables TRIP_AUTH_USERNAME y TRIP_AUTH_PASSWORD configuradas.', 'error', { duration: 6000 })
    }
  }

  // ─── Sync: bajar de la nube ───
  async function syncPullRemote() {
    setIsMobileActionsOpen(false)
    if (!confirm('Esto va a reemplazar tus datos locales con los de la nube. Se guardara un backup local antes por si necesitas volver atras. ¿Continuar?')) return

    // Guardo backup local antes de pisar
    snapshotLocalBackup()

    setSyncState('syncing')
    try {
      const remoteBackup = await fetchRemoteVaultBackupJson(auth.username, auth.password)
      if (!remoteBackup) {
        setSyncState('idle')
        showToast('No hay datos en la nube todavia. Subi tu version local primero.', 'info', { duration: 4000 })
        return
      }
      importVaultBackupJson(remoteBackup.rawJson)
      if (remoteBackup.timestamp) setLastSyncAt(remoteBackup.timestamp)
      const syncedData = loadVault(auth.password)
      if (!syncedData) throw new Error('Vault vacio o credenciales no coinciden')
      setData(syncedData)
      setSelectedDestinationId(null)
      setSelectedDate(null)
      setSyncState('ok')
      showToast('Datos descargados de la nube. Podes restaurar el backup local si algo salio mal.', 'success', { duration: 4000 })
    } catch (err) {
      setSyncState('error')
      // Restauro el backup si fallo la descarga
      restoreLocalBackup()
      showToast('No se pudo descargar de la nube. Verifica tu conexion y credenciales.', 'error', { duration: 5000 })
    }
  }

  // ─── Rollback: restaurar backup local ───
  function rollbackToLocalBackup() {
    setIsMobileActionsOpen(false)
    const backupTs = getLocalBackupTimestamp()
    const label = backupTs
      ? new Date(backupTs).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : 'desconocida'

    if (!confirm(`Esto restaura el backup local guardado el ${label}. Se reemplazaran los datos actuales. ¿Continuar?`)) return

    const restored = restoreLocalBackup()
    if (!restored) {
      showToast('No se encontro un backup local para restaurar', 'error')
      return
    }

    try {
      const restoredData = loadVault(auth.password)
      if (!restoredData) throw new Error('Vault vacio')
      setData(restoredData)
      setSelectedDestinationId(null)
      setSelectedDate(null)
      showToast('Backup local restaurado correctamente', 'success')
    } catch {
      showToast('No se pudo restaurar el backup local', 'error')
    }
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
            <button className="btn btn-ghost" onClick={syncPushLocal}>⬆ Subir local</button>
            <button className="btn btn-ghost" onClick={syncPullRemote}>⬇ Bajar nube</button>
            {hasLocalBackup() && (
              <button className="btn btn-ghost" onClick={rollbackToLocalBackup}>↩ Restaurar backup</button>
            )}
            <div className={`sync-badge ${syncState}`}>
              <span>{syncState === 'syncing' ? 'Sincronizando...' : syncState === 'ok' ? 'Sincronizado' : syncState === 'error' ? 'Error de sync' : 'Sin sincronizar'}</span>
              <span className="sync-time">{formattedLastSyncAt ? `Ultima sync: ${formattedLastSyncAt}` : 'Ultima sync: -'}</span>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowEmailDialog(true)}>✉ Email de aviso</button>
            <button className="btn btn-ghost theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Modo oscuro' : '☀️ Modo claro'}
            </button>
            <button className="btn btn-ghost" onClick={lock}>Cerrar sesion</button>
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

      {showEmailDialog && (
        <EmailDialog
          currentEmail={notificationEmail}
          onSave={saveEmail}
          onClose={() => setShowEmailDialog(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

function EmailDialog({ currentEmail, onSave, onClose }) {
  const [email, setEmail] = useState(currentEmail)

  function handleSubmit(e) {
    e.preventDefault()
    onSave(email)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal email-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Email de notificacion</h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="email-dialog-note">
            Este email se usara en el futuro para enviarte un recordatorio antes de cada viaje con el resumen de tu itinerario. Por ahora solo se guarda localmente.
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              {currentEmail && (
                <button type="button" className="btn btn-danger" onClick={() => onSave('')}>Quitar</button>
              )}
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
