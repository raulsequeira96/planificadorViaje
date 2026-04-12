import { useMemo, useState } from 'react'
import { EVENT_TYPES, formatDateISO, monthLabel, mondayFirstIndex, parseISO } from '../lib/events'

function withHexAlpha(color, alphaHex) {
  if (typeof color !== 'string') return color
  if (color.startsWith('#') && color.length === 7) return `${color}${alphaHex}`
  return color
}

function nearestUpcomingMonth(destinations) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let nearest = null
  for (const d of destinations) {
    if (!d.startDate) continue
    const start = parseISO(d.startDate)
    if (start >= today && (!nearest || start < nearest)) nearest = start
  }
  return nearest
}

export default function Calendar({ destinations, events, selectedDestinationId, onDayClick }) {
  const today = new Date()
  const initialDate = nearestUpcomingMonth(destinations) || today
  const [year, setYear] = useState(initialDate.getFullYear())
  const [month, setMonth] = useState(initialDate.getMonth())

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.id === selectedDestinationId) || null,
    [destinations, selectedDestinationId]
  )

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events])

  // Ahora almacena un ARRAY de destinos por fecha para mostrar superposiciones
  const destinationsByDate = useMemo(() => {
    const map = {}
    const visibleDestinations = selectedDestinationId
      ? destinations.filter((d) => d.id === selectedDestinationId)
      : destinations

    for (const d of visibleDestinations) {
      if (!d.startDate || !d.endDate) continue
      const start = parseISO(d.startDate)
      const end = parseISO(d.endDate)
      const cur = new Date(start)
      while (cur <= end) {
        const key = formatDateISO(cur)
        if (!map[key]) map[key] = []
        map[key].push(d)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [destinations, selectedDestinationId])

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = mondayFirstIndex(firstOfMonth)

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayISO = formatDateISO(today)

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <div>
          <h2>{monthLabel(year, month)}</h2>
          {selectedDestination && (
            <div className="calendar-filter-state">
              <span className="dot" style={{ background: selectedDestination.color }} />
              <span>{selectedDestination.name}</span>
            </div>
          )}
        </div>
        <div className="calendar-nav">
          <button onClick={prev} aria-label="Mes anterior">&#8249;</button>
          <button className="btn-today" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}>Hoy</button>
          <button onClick={next} aria-label="Mes siguiente">&#8250;</button>
        </div>
      </div>

      <div className="calendar-grid">
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((w) => (
          <div key={w} className="weekday-header">{w}</div>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <div key={'e'+idx} className="day-cell empty" />
          const iso = formatDateISO(new Date(year, month, day))
          const dests = destinationsByDate[iso] || []
          const dest = dests[0] || null
          const dayEvents = eventsByDate[iso] || []
          const uniqueIcons = [...new Set(dayEvents.map((e) => EVENT_TYPES[e.type]?.icon).filter(Boolean))]
          const isToday = iso === todayISO
          const isSelectedDestinationDay = !!selectedDestination && dests.some((d) => d.id === selectedDestination.id)
          const selectedBackground = isSelectedDestinationDay
            ? `linear-gradient(180deg, ${withHexAlpha(dest.color, '2b')}, var(--bg-paper) 76%)`
            : undefined

          return (
            <div
              key={iso}
              className={`day-cell ${isToday ? 'today' : ''} ${dests.length > 0 ? 'in-range' : ''} ${isSelectedDestinationDay ? 'selected-destination' : ''}`}
              style={isSelectedDestinationDay ? { '--destination-color': dest.color, background: selectedBackground } : undefined}
              onClick={() => onDayClick(iso)}
            >
              {/* Barras de destino: una por cada destino en ese día */}
              {dests.length === 1 && (
                <div className="range-bar" style={{ background: dests[0].color }} />
              )}
              {dests.length > 1 && (
                <div className="range-bar range-bar-multi">
                  {dests.map((d) => (
                    <div key={d.id} className="range-bar-segment" style={{ background: d.color }} />
                  ))}
                </div>
              )}
              <div className="day-number">{day}</div>
              {dests.length === 1 && <div className="destination-label">{dests[0].name}</div>}
              {dests.length > 1 && (
                <div className="destination-label destination-label-multi">
                  {dests.map((d) => (
                    <span key={d.id} className="dest-dot" style={{ background: d.color }} title={d.name} />
                  ))}
                </div>
              )}
              {uniqueIcons.length > 0 && (
                <div className="day-icons">
                  {uniqueIcons.slice(0, 4).map((icon, i) => (
                    <span key={i} className="icon-chip">{icon}</span>
                  ))}
                  <span className="event-count">{dayEvents.length}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
