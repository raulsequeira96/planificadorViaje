import { useState } from 'react'
import { EVENT_TYPES, getEventStartTime, parseISO } from '../lib/events'
import EventForm from './EventForm'

export default function DayModal({ date, events, onClose, onSaveEvent, onDeleteEvent }) {
  const [editing, setEditing] = useState(null) // null | 'new' | event
  const dayEvents = [...events].sort((a, b) => getEventStartTime(a).localeCompare(getEventStartTime(b)))

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{formatted}</h2>
            <div className="date-sub">{dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {editing ? (
            <EventForm
              date={date}
              existing={editing === 'new' ? null : editing}
              onSave={(ev) => { onSaveEvent(ev); setEditing(null) }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <>
              <div className="day-events">
                {dayEvents.length === 0 && (
                  <div className="empty-state">Sin eventos. Agregá el primero abajo.</div>
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
                      </div>

                      <div className="event-actions">
                        {mapLoc && (
                          <a href={mapsUrl(mapLoc)} target="_blank" rel="noopener noreferrer">📍 Abrir en Maps</a>
                        )}
                        {event.attachment && (
                          <button onClick={() => openAttachment(event.attachment)}>
                            {event.attachment.type?.startsWith('image') ? '🖼️' : '📄'} Ver adjunto
                          </button>
                        )}
                        <button onClick={() => setEditing(event)}>Editar</button>
                        <button onClick={() => onDeleteEvent(event.id)}>Eliminar</button>
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
