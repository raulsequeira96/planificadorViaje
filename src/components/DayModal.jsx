import { useMemo, useState } from 'react'
import { EVENT_TYPES, COMMON_FIELDS, getEventStartTime, getEventSplits, parseISO } from '../lib/events'
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

  function handleAcceptSplits(event, splits) {
    onSetEventPaidBy?.(event.id, splits)
    if (showToast) {
      const names = splits
        .map((s) => wallets.find((w) => w.id === s.walletId)?.name)
        .filter(Boolean)
        .join(', ')
      showToast(`Descontado de ${names || 'billetera'}`, 'success')
    }
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
                        onAcceptSplits={handleAcceptSplits}
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

function fmtMoney(n) {
  const v = Number(n) || 0
  return `$${v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}

function PaidByControl({ event, wallets, onAcceptSplits, onUndo }) {
  const [selecting, setSelecting] = useState(false)
  const cost = parseFloat(event.data?.cost)
  if (!Number.isFinite(cost) || cost <= 0) return null

  const splits = getEventSplits(event)
  if (splits.length > 0) {
    return (
      <div className="paid-by-row paid-by-done">
        <div className="paid-by-badges">
          {splits.map((s, i) => {
            const w = wallets.find((x) => x.id === s.walletId)
            return (
              <span key={i} className="paid-by-badge">
                <span className="wallet-dot" style={{ background: w?.color || 'var(--ink-muted)' }} />
                {w?.name || 'billetera eliminada'} · {fmtMoney(s.amount)}
              </span>
            )
          })}
        </div>
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

  if (selecting) {
    return (
      <SplitSelector
        cost={cost}
        wallets={wallets}
        onConfirm={(splits) => { onAcceptSplits(event, splits); setSelecting(false) }}
        onCancel={() => setSelecting(false)}
      />
    )
  }

  return (
    <div className="paid-by-row">
      <button
        type="button"
        className="btn btn-accept"
        onClick={() => {
          if (wallets.length === 1) onAcceptSplits(event, [{ walletId: wallets[0].id, amount: cost }])
          else setSelecting(true)
        }}
      >
        ✓ Aceptar gasto ({fmtMoney(cost)})
      </button>
    </div>
  )
}

function SplitSelector({ cost, wallets, onConfirm, onCancel }) {
  const [selected, setSelected] = useState({}) // { walletId: true }
  const [amounts, setAmounts] = useState({}) // { walletId: string }
  const [touched, setTouched] = useState({}) // { walletId: true } when user typed an amount

  const selectedIds = useMemo(
    () => wallets.map((w) => w.id).filter((id) => selected[id]),
    [selected, wallets]
  )

  // Reparte el costo en partes iguales entre los seleccionados, salvo los tocados manualmente
  const effectiveAmounts = useMemo(() => {
    const result = {}
    if (selectedIds.length === 0) return result
    let remaining = cost
    const untouched = []
    for (const id of selectedIds) {
      if (touched[id]) {
        const v = parseFloat(amounts[id])
        result[id] = Number.isFinite(v) ? v : 0
        remaining -= result[id]
      } else {
        untouched.push(id)
      }
    }
    if (untouched.length > 0) {
      const share = remaining / untouched.length
      for (const id of untouched) result[id] = share
    }
    return result
  }, [selectedIds, touched, amounts, cost])

  const sum = useMemo(
    () => Object.values(effectiveAmounts).reduce((a, b) => a + b, 0),
    [effectiveAmounts]
  )
  const diff = +(cost - sum).toFixed(2)

  function toggle(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
    setTouched((prev) => ({ ...prev, [id]: false }))
  }

  function changeAmount(id, value) {
    setAmounts((prev) => ({ ...prev, [id]: value }))
    setTouched((prev) => ({ ...prev, [id]: true }))
  }

  function handleConfirm() {
    const splits = selectedIds
      .map((id) => ({ walletId: id, amount: +(effectiveAmounts[id] || 0).toFixed(2) }))
      .filter((s) => s.amount > 0)
    if (splits.length === 0) return
    onConfirm(splits)
  }

  return (
    <div className="paid-by-row paid-by-split">
      <div className="paid-by-prompt">Descontar de (podes elegir varios):</div>
      <div className="split-list">
        {wallets.map((w) => {
          const isSelected = !!selected[w.id]
          const value = isSelected
            ? (touched[w.id]
              ? (amounts[w.id] ?? '')
              : (effectiveAmounts[w.id]?.toFixed(2) ?? ''))
            : ''
          return (
            <div key={w.id} className={`split-row ${isSelected ? 'selected' : ''}`}>
              <label className="split-row-label">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(w.id)}
                />
                <span className="wallet-dot" style={{ background: w.color }} />
                <span className="split-row-name">{w.name}</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="split-amount"
                value={value}
                onChange={(e) => changeAmount(w.id, e.target.value)}
                onFocus={(e) => {
                  if (isSelected && !touched[w.id]) {
                    setAmounts((prev) => ({ ...prev, [w.id]: effectiveAmounts[w.id]?.toFixed(2) ?? '' }))
                  }
                }}
                disabled={!isSelected}
                placeholder="0"
              />
            </div>
          )
        })}
      </div>
      <div className={`split-summary ${Math.abs(diff) > 0.01 ? 'split-summary-mismatch' : ''}`}>
        <span>Total asignado: {fmtMoney(sum)} / {fmtMoney(cost)}</span>
        {Math.abs(diff) > 0.01 && (
          <span className="split-diff">Faltan {fmtMoney(diff)}</span>
        )}
      </div>
      <div className="split-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button
          type="button"
          className="btn btn-accept"
          onClick={handleConfirm}
          disabled={selectedIds.length === 0 || sum <= 0}
        >
          ✓ Confirmar
        </button>
      </div>
    </div>
  )
}
