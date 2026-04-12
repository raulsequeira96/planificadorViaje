import { useMemo, useState } from 'react'
import { EVENT_TYPES, formatDateISO, monthLabel, mondayFirstIndex, parseISO } from '../lib/events'

function withHexAlpha(color, alphaHex) {
  if (typeof color !== 'string') return color
  if (color.startsWith('#') && color.length === 7) return `${color}${alphaHex}`
  return color
}

export default function Calendar({ destinations, events, selectedDestinationId, onDayClick }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

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

  const destinationByDate = useMemo(() => {
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
        map[formatDateISO(cur)] = d
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
          <button onClick={prev} aria-label="Mes anterior">‹</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} aria-label="Hoy">●</button>
          <button onClick={next} aria-label="Mes siguiente">›</button>
        </div>
      </div>

      <div className="calendar-grid">
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((w) => (
          <div key={w} className="weekday-header">{w}</div>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <div key={'e'+idx} className="day-cell empty" />
          const iso = formatDateISO(new Date(year, month, day))
          const dest = destinationByDate[iso]
          const dayEvents = eventsByDate[iso] || []
          const uniqueIcons = [...new Set(dayEvents.map((e) => EVENT_TYPES[e.type]?.icon).filter(Boolean))]
          const isToday = iso === todayISO
          const isSelectedDestinationDay = !!selectedDestination && dest?.id === selectedDestination.id
          const selectedBackground = isSelectedDestinationDay
            ? `linear-gradient(180deg, ${withHexAlpha(dest.color, '2b')}, var(--bg-paper) 76%)`
            : undefined

          return (
            <div
              key={iso}
              className={`day-cell ${isToday ? 'today' : ''} ${dest ? 'in-range' : ''} ${isSelectedDestinationDay ? 'selected-destination' : ''}`}
              style={isSelectedDestinationDay ? { '--destination-color': dest.color, background: selectedBackground } : undefined}
              onClick={() => onDayClick(iso)}
            >
              {dest && <div className="range-bar" style={{ background: dest.color }} />}
              <div className="day-number">{day}</div>
              {dest && <div className="destination-label">{dest.name}</div>}
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
