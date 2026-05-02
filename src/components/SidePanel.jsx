import { useMemo, useState } from 'react'
import {
  EVENT_TYPES,
  DESTINATION_COLOR_PALETTE,
  destinationRanges,
  destinationDateSummary,
  uid
} from '../lib/events'
import NotesPanel from './NotesPanel'
import ExpensesPanel from './ExpensesPanel'
import WalletPanel from './WalletPanel'
import CollapsibleCard from './CollapsibleCard'

export default function SidePanel({
  destinations,
  events,
  notes,
  wallets,
  selectedDestinationId,
  onSelectDestination,
  onAddDestination,
  onDeleteDestination,
  onEditDestination,
  onClearDestinations,
  onSaveNote,
  onDeleteNote,
  onAddWallet,
  onEditWallet,
  onDeleteWallet,
  showToast
}) {
  const [formMode, setFormMode] = useState(null) // null | 'new' | { id, ... } (existing)

  function startCreate() {
    setFormMode({
      id: null,
      name: '',
      color: DESTINATION_COLOR_PALETTE[destinations.length % DESTINATION_COLOR_PALETTE.length],
      ranges: [{ startDate: '', endDate: '' }]
    })
  }

  function startEdit(dest) {
    const ranges = destinationRanges(dest)
    setFormMode({
      id: dest.id,
      name: dest.name,
      color: dest.color,
      ranges: ranges.length ? ranges.map((r) => ({ ...r })) : [{ startDate: '', endDate: '' }]
    })
  }

  function handleSubmitForm(payload) {
    if (formMode?.id) {
      onEditDestination(formMode.id, payload)
      if (showToast) showToast('Destino actualizado', 'success')
    } else {
      onAddDestination({ id: uid(), ...payload })
      if (showToast) showToast('Destino creado', 'success')
    }
    setFormMode(null)
  }

  function handleClear() {
    if (destinations.length === 0) return
    if (!confirm('¿Estas seguro de eliminar todos los destinos?')) return
    onClearDestinations()
  }

  function handleDelete(id) {
    onDeleteDestination(id)
    if (showToast) showToast('Destino eliminado', 'success')
  }

  return (
    <aside className="side-panel">
      <CollapsibleCard storageKey="destinations" title="Destinos" count={destinations.length}>
        {destinations.length > 0 && (
          <div className="destination-filters">
            <button
              type="button"
              className={`destination-filter-chip ${selectedDestinationId === null ? 'active' : ''}`}
              onClick={() => onSelectDestination(null)}
            >
              Todos
            </button>
            {destinations.map((d) => (
              <button
                key={`chip-${d.id}`}
                type="button"
                className={`destination-filter-chip ${selectedDestinationId === d.id ? 'active' : ''}`}
                onClick={() => onSelectDestination(d.id)}
              >
                <span className="chip-dot" style={{ background: d.color }} />
                <span>{d.name}</span>
              </button>
            ))}
          </div>
        )}

        {destinations.length === 0 && !formMode && (
          <div className="empty-state">Aun no hay destinos</div>
        )}

        <div className="destination-list">
          {destinations.map((d) => (
            <div
              key={d.id}
              className={`destination-item ${selectedDestinationId === d.id ? 'selected' : ''}`}
              onClick={() => onSelectDestination(d.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectDestination(d.id)
                }
              }}
            >
              <div className="destination-swatch" style={{ background: d.color }} />
              <div className="destination-info">
                <div className="destination-name">{d.name}</div>
                <div className="destination-dates">{destinationDateSummary(d) || 'Sin fechas'}</div>
              </div>
              <div className="destination-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => startEdit(d)}
                  title="Editar"
                >
                  ✎
                </button>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleDelete(d.id)}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {destinations.length > 1 && !formMode && (
          <button
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={handleClear}
          >
            Limpiar destinos
          </button>
        )}

        {formMode ? (
          <DestinationForm
            initial={formMode}
            isEdit={!!formMode.id}
            onSubmit={handleSubmitForm}
            onCancel={() => setFormMode(null)}
          />
        ) : (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            onClick={startCreate}
          >
            + Agregar destino
          </button>
        )}
      </CollapsibleCard>

      <WalletPanel
        wallets={wallets}
        events={events}
        onAddWallet={onAddWallet}
        onEditWallet={onEditWallet}
        onDeleteWallet={onDeleteWallet}
        showToast={showToast}
      />

      <ExpensesPanel events={events} />

      <NotesPanel
        notes={notes}
        onSave={onSaveNote}
        onDelete={onDeleteNote}
        showToast={showToast}
      />

      <CollapsibleCard storageKey="legend" title="Leyenda" defaultOpen={false}>
        {Object.values(EVENT_TYPES).map((t) => (
          <div key={t.id} className="legend-row">
            <span className="icon">{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
        <div className="divider" />
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          Los iconos sobre cada dia del calendario indican los tipos de evento programados. Un mismo dia puede tener varios.
        </div>
      </CollapsibleCard>

      <div className="ornament">✦ ✧ ✦</div>
    </aside>
  )
}

function DestinationForm({ initial, isEdit, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '')
  const [color, setColor] = useState(initial.color || DESTINATION_COLOR_PALETTE[0])
  const [ranges, setRanges] = useState(
    initial.ranges?.length ? initial.ranges : [{ startDate: '', endDate: '' }]
  )

  function updateRange(idx, key, value) {
    setRanges((prev) => prev.map((r, i) => {
      if (i !== idx) return r
      const next = { ...r, [key]: value }
      if (key === 'startDate' && next.endDate && next.endDate < value) {
        next.endDate = ''
      }
      return next
    }))
  }

  function addRange() {
    setRanges((prev) => [...prev, { startDate: '', endDate: '' }])
  }

  function removeRange(idx) {
    setRanges((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const validRanges = ranges
      .filter((r) => r.startDate && r.endDate)
      .map((r) => ({ startDate: r.startDate, endDate: r.endDate }))
    if (!validRanges.length) return
    onSubmit({ name: trimmed, color, ranges: validRanges })
  }

  return (
    <form onSubmit={handleSubmit} className="destination-form">
      <div className="form-section-title">{isEdit ? 'Editar destino' : 'Nuevo destino'}</div>

      <div className="form-group">
        <label>Nombre del destino</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej: Tokio, Roma..."
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="form-group">
        <label>Fechas</label>
        <div className="range-editor">
          {ranges.map((r, idx) => (
            <div key={idx} className="range-editor-row">
              <input
                type="date"
                value={r.startDate}
                onChange={(e) => updateRange(idx, 'startDate', e.target.value)}
                aria-label="Desde"
              />
              <span className="range-arrow">→</span>
              <input
                type="date"
                value={r.endDate}
                min={r.startDate || undefined}
                onChange={(e) => updateRange(idx, 'endDate', e.target.value)}
                aria-label="Hasta"
              />
              {ranges.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon range-editor-remove"
                  onClick={() => removeRange(idx)}
                  title="Quitar rango"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={addRange}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          >
            + Agregar otro rango
          </button>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Guardar cambios' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}

function ColorPicker({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(!DESTINATION_COLOR_PALETTE.includes(value))

  return (
    <div className="color-picker">
      <div className="color-swatches">
        {DESTINATION_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-swatch ${value === c ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => { onChange(c); setShowCustom(false) }}
            title={c}
            aria-label={`Color ${c}`}
          />
        ))}
        <button
          type="button"
          className={`color-swatch color-swatch-custom ${showCustom ? 'selected' : ''}`}
          onClick={() => setShowCustom((s) => !s)}
          title="Color personalizado"
          aria-label="Color personalizado"
        >
          🎨
        </button>
      </div>
      {showCustom && (
        <div className="color-custom-row">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="color-custom-input"
            aria-label="Selector de color"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#RRGGBB"
            className="color-hex-input"
            aria-label="Codigo de color"
          />
          <span className="color-preview" style={{ background: value }} />
        </div>
      )}
    </div>
  )
}
