import { useState } from 'react'
import { EVENT_TYPES, COMMON_FIELDS, getEventStartTime, parseISO } from '../lib/events'
import EventForm from './EventForm'

export default function DayModal({ date, events, wallets = [], onClose, onSaveEvent, onDeleteEvent, onSetEventPaidBy, showToast }) {
  const [editing, setEditing] = useState(null) // null | 'new' | event
  const dayEvents = [...events].sort((a, b) => getEventStartTime(a).localeCompare(getEventStartTime(b)))
  const dayCost = dayEvents.reduce((acc, e) => {
    const c = parseFloat(e.data?.cost)
    return Number.isFinite(c) && c > 0 ? acc + c : acc
  }, 0)

  const d = parseISO(date)
  const formatted = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  function mapsUrl(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
  }

  function openAttachment(attachment) {
    if (!attachment) return
    const win = window.open()
    if (!win) return
    if (attachment.type?.startsWith('image')) {
      win.document.write(`<title>${attachment.name}</title><img src="${attachment.dataUrl}" style="max-width:100%">`)
    } else {
      win.location.href = attachment.dataUrl
    }
  }

  function downloadAttachment(attachment) {
    if (!attachment?.dataUrl) return
    const a = document.createElement('a')
    a.href = attachment.dataUrl
    a.download = attachment.name || 'adjunto'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  function handleSaveEvent(ev) {
    onSaveEvent(ev)
    setEditing(null)
    if (showToast) {
      const isNew = !events.find((e) => e.id === ev.id)
      showToast(isNew ? 'Evento creado' : 'Evento actualizado', 'success')
    }
  }

  function handleDeleteEvent(id) {
    onDeleteEvent(id)
    if (showToast) showToast('Evento eliminado', 'success')
  }

  function handleAcceptCost(event, walletId) {
    const w = wallets.find((x) => x.id === walletId)
    onSetEventPaidBy?.(event.id, walletId)
    if (showToast && w) showToast(`Descontado de ${w.name}`, 'success')
  }

  function handleUndoPaid(event) {
    onSetEventPaidBy?.(event.id, null)
    if (showToast) showToast('Asignacion revertida', 'info')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{formatted}</h2>
            <div className="date-sub">
              {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
              {dayCost > 0 && <> · Gasto del dia: ${dayCost.toLocaleString('es-AR')}</>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {editing ? (
            <EventForm
              date={date}
              existing={editing === 'new' ? null : editing}
              onSave={handleSaveEvent}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <>
              <div className="day-events">
                {dayEvents.length === 0 && (
                  <div className="empty-state">Sin eventos. Agrega el primero abajo.</div>
                )}

                {dayEvents.map((event) => {
                  const typeConfig = EVENT_TYPES[event.type]
                  const startTime = getEventStartTime(event)
                  const mapLoc = event.data.mapLocation || event.data.location || event.data.destination

                  return (
                    <div key={event.id} className="event-card" style={{ borderLeftColor: typeConfig.color }}>
                      <div className="event-card-header">
                        <div className="event-card-title">
                          <span className="icon">{typeConfig.icon}</span>
                          <span>{typeConfig.label}</span>
                        </div>
                        <span className="event-time">{startTime}</span>
                      </div>

                      <div className="event-details">
                        {typeConfig.fields.map((f) => {
                          const val = event.data[f.key]
                          if (!val) return null
                          return (
                            <div key={f.key} className="event-detail-row">
                              <span className="key">{f.label}</span>
                              <span className="val">{val}</span>
                            </div>
                          )
                        })}
                        {event.data.cost && (
                          <div className="event-detail-row">
                            <span className="key">Costo</span>
                            <span className="val">${event.data.cost}</span>
                          </div>
                        )}
                        {event.data.mapLocation && (
                          <div className="event-detail-row">
                            <span className="key">Ubicacion</span>
                            <span className="val">{event.data.mapLocation}</span>
                          </div>
                        )}
                      </div>

                      <PaidByControl
                        event={event}
                        wallets={wallets}
                        onAccept={handleAcceptCost}
                        onUndo={handleUndoPaid}
                      />

                      {event.attachment && (
                        <div className="event-attachment-info">
                          <span className="file-icon">{event.attachment.type?.startsWith('image') ? '🖼️' : '📄'}</span>
                          <span className="file-name">{event.attachment.name}</span>
                        </div>
                      )}

                      <div className="event-actions">
                        {mapLoc && (
                          <a href={mapsUrl(mapLoc)} target="_blank" rel="noopener noreferrer">📍 Maps</a>
                        )}
                        {event.attachment && (
                          <>
                            <button onClick={() => openAttachment(event.attachment)}>
                              {event.attachment.type?.startsWith('image') ? '🖼️' : '📄'} Ver
                            </button>
                            <button onClick={() => downloadAttachment(event.attachment)}>
                              ⬇ Descargar
                            </button>
                          </>
                        )}
                        <button onClick={() => setEditing(event)}>Editar</button>
                        <button onClick={() => handleDeleteEvent(event.id)}>Eliminar</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setEditing('new')}
              >
                + Agregar evento
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PaidByControl({ event, wallets, onAccept, onUndo }) {
  const [selecting, setSelecting] = useState(false)
  const cost = parseFloat(event.data?.cost)
  if (!Number.isFinite(cost) || cost <= 0) return null

  const paidById = event.data?.paidBy
  if (paidById) {
    const w = wallets.find((x) => x.id === paidById)
    return (
      <div className="paid-by-row paid-by-done">
        <span className="paid-by-badge">
          <span className="wallet-dot" style={{ background: w?.color || 'var(--ink-muted)' }} />
          ✓ Pagado por {w?.name || 'billetera eliminada'}
        </span>
        <button type="button" className="paid-by-undo" onClick={() => onUndo(event)}>Deshacer</button>
      </div>
    )
  }

  if (wallets.length === 0) {
    return (
      <div className="paid-by-row paid-by-empty">
        Crea una billetera para descontar este gasto
      </div>
    )
  }

  if (selecting && wallets.length > 1) {
    return (
      <div className="paid-by-row paid-by-select">
        <span className="paid-by-prompt">Descontar de:</span>
        <div className="paid-by-options">
          {wallets.map((w) => (
            <button
              key={w.id}
              type="button"
              className="paid-by-option"
              onClick={() => { onAccept(event, w.id); setSelecting(false) }}
            >
              <span className="wallet-dot" style={{ background: w.color }} />
              {w.name}
            </button>
          ))}
          <button type="button" className="paid-by-cancel" onClick={() => setSelecting(false)}>Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="paid-by-row">
      <button
        type="button"
        className="btn btn-accept"
        onClick={() => {
          if (wallets.length === 1) onAccept(event, wallets[0].id)
          else setSelecting(true)
        }}
      >
        ✓ Aceptar gasto (${cost.toLocaleString('es-AR')})
      </button>
    </div>
  )
}
