import { useState } from 'react'
import { EVENT_TYPES, DESTINATION_COLORS, uid } from '../lib/events'

export default function SidePanel({
  destinations,
  events,
  selectedDestinationId,
  onSelectDestination,
  onAddDestination,
  onDeleteDestination
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })

  function handleAdd(e) {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return
    const color = DESTINATION_COLORS[destinations.length % DESTINATION_COLORS.length]
    onAddDestination({ id: uid(), ...form, color })
    setForm({ name: '', startDate: '', endDate: '' })
    setShowForm(false)
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
          <div className="empty-state">Aún no hay destinos</div>
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
                <div className="destination-dates">{d.startDate} → {d.endDate}</div>
              </div>
              <div className="destination-actions">
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteDestination(d.id)
                  }}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

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
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Hasta</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
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
          Los iconos sobre cada día del calendario indican los tipos de evento programados. Un mismo día puede tener varios.
        </div>
      </div>

      <div className="ornament">✦ ✧ ✦</div>
    </aside>
  )
}
