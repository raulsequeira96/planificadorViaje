import { useState } from 'react'
import { EVENT_TYPES, DESTINATION_COLORS, uid } from '../lib/events'

export default function SidePanel({
  destinations,
  events,
  selectedDestinationId,
  onSelectDestination,
  onAddDestination,
  onDeleteDestination,
  onEditDestination,
  onClearDestinations,
  showToast
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return
    const color = DESTINATION_COLORS[destinations.length % DESTINATION_COLORS.length]
    onAddDestination({ id: uid(), ...form, color })
    setForm({ name: '', startDate: '', endDate: '' })
    setShowForm(false)
    if (showToast) showToast('Destino creado', 'success')
  }

  function startEdit(dest) {
    setEditingId(dest.id)
    setEditName(dest.name)
  }

  function saveEdit(dest) {
    const trimmed = editName.trim()
    if (!trimmed) return
    if (trimmed !== dest.name) {
      onEditDestination(dest.id, { name: trimmed })
      if (showToast) showToast('Destino actualizado', 'success')
    }
    setEditingId(null)
    setEditName('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
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
      <div className="panel-card">
        <h3>
          Destinos
          <span className="count">{destinations.length}</span>
        </h3>

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

        {destinations.length === 0 && !showForm && (
          <div className="empty-state">Aun no hay destinos</div>
        )}

        <div className="destination-list">
          {destinations.map((d) => (
            <div
              key={d.id}
              className={`destination-item ${selectedDestinationId === d.id ? 'selected' : ''}`}
              onClick={() => { if (editingId !== d.id) onSelectDestination(d.id) }}
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
                {editingId === d.id ? (
                  <div className="destination-edit-inline" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(d)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                      className="destination-edit-input"
                    />
                    <div className="destination-edit-actions">
                      <button type="button" className="btn-inline-save" onClick={() => saveEdit(d)}>✓</button>
                      <button type="button" className="btn-inline-cancel" onClick={cancelEdit}>×</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="destination-name">{d.name}</div>
                    <div className="destination-dates">{d.startDate} → {d.endDate}</div>
                  </>
                )}
              </div>
              <div className="destination-actions" onClick={(e) => e.stopPropagation()}>
                {editingId !== d.id && (
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => startEdit(d)}
                    title="Editar"
                  >
                    ✎
                  </button>
                )}
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

        {destinations.length > 1 && !showForm && (
          <button
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={handleClear}
          >
            Limpiar destinos
          </button>
        )}

        {showForm ? (
          <form onSubmit={handleAdd} style={{ marginTop: 16 }}>
            <div className="form-group">
              <label>Nombre del destino</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ej: Tokio, Roma..."
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Desde</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate && form.endDate < e.target.value ? '' : form.endDate })} />
              </div>
              <div className="form-group">
                <label>Hasta</label>
                <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Agregar</button>
            </div>
          </form>
        ) : (
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => setShowForm(true)}>
            + Agregar destino
          </button>
        )}
      </div>

      <div className="panel-card">
        <h3>Leyenda</h3>
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
      </div>

      <div className="ornament">✦ ✧ ✦</div>
    </aside>
  )
}
