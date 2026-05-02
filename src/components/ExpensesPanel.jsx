import { useMemo, useState } from 'react'
import { EVENT_TYPES, parseISO } from '../lib/events'
import CollapsibleCard from './CollapsibleCard'

function formatMoney(value) {
  if (!Number.isFinite(value)) return '$0'
  return `$${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}

function formatDateLabel(iso) {
  try {
    const d = parseISO(iso)
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
  } catch {
    return iso
  }
}

export default function ExpensesPanel({ events }) {
  const [expanded, setExpanded] = useState(false)

  const { total, byDate, byType } = useMemo(() => {
    const byDateMap = {}
    const byTypeMap = {}
    let total = 0
    for (const e of events) {
      const c = parseFloat(e.data?.cost)
      if (!Number.isFinite(c) || c <= 0) continue
      total += c
      byDateMap[e.date] = (byDateMap[e.date] || 0) + c
      byTypeMap[e.type] = (byTypeMap[e.type] || 0) + c
    }
    const byDate = Object.entries(byDateMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
    const byType = Object.entries(byTypeMap)
      .map(([type, value]) => ({ type, value }))
      .sort((a, b) => b.value - a.value)
    return { total, byDate, byType }
  }, [events])

  const days = byDate.length
  const avgPerDay = days ? total / days : 0

  return (
    <CollapsibleCard storageKey="expenses" title="Gastos" count={formatMoney(total)}>
      {total === 0 ? (
        <div className="empty-state">Aun no hay gastos cargados</div>
      ) : (
        <>
          <div className="expenses-summary-grid">
            <div className="expenses-summary-item">
              <div className="expenses-summary-label">Total</div>
              <div className="expenses-summary-value">{formatMoney(total)}</div>
            </div>
            <div className="expenses-summary-item">
              <div className="expenses-summary-label">Dias con gasto</div>
              <div className="expenses-summary-value">{days}</div>
            </div>
            <div className="expenses-summary-item">
              <div className="expenses-summary-label">Promedio/dia</div>
              <div className="expenses-summary-value">{formatMoney(avgPerDay)}</div>
            </div>
          </div>

          {byType.length > 0 && (
            <div className="expenses-bytype">
              {byType.map(({ type, value }) => {
                const cfg = EVENT_TYPES[type]
                if (!cfg) return null
                const pct = total > 0 ? (value / total) * 100 : 0
                return (
                  <div key={type} className="expenses-bytype-row">
                    <div className="expenses-bytype-head">
                      <span>{cfg.icon} {cfg.label}</span>
                      <span>{formatMoney(value)}</span>
                    </div>
                    <div className="expenses-bytype-bar">
                      <div className="expenses-bytype-bar-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
            onClick={() => setExpanded((s) => !s)}
          >
            {expanded ? 'Ocultar detalle por dia' : `Ver detalle por dia (${days})`}
          </button>

          {expanded && (
            <div className="expenses-bydate">
              {byDate.map(({ date, value }) => (
                <div key={date} className="expenses-bydate-row">
                  <span className="expenses-bydate-day">{formatDateLabel(date)}</span>
                  <span className="expenses-bydate-value">{formatMoney(value)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </CollapsibleCard>
  )
}
