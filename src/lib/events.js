export const EVENT_TYPES = {
  flight: {
    id: 'flight',
    label: 'Vuelo',
    icon: '✈️',
    color: '#3b6ea8',
    fields: [
      { key: 'origin', label: 'Origen', type: 'text' },
      { key: 'destination', label: 'Destino', type: 'text' },
      { key: 'departureTime', label: 'Hora de salida', type: 'time' },
      { key: 'arrivalTime', label: 'Hora de llegada', type: 'time' },
      { key: 'flightNumber', label: 'Número de vuelo', type: 'text' }
    ]
  },
  train: {
    id: 'train',
    label: 'Tren',
    icon: '🚆',
    color: '#5a7a3e',
    fields: [
      { key: 'origin', label: 'Origen', type: 'text' },
      { key: 'destination', label: 'Destino', type: 'text' },
      { key: 'departureTime', label: 'Hora de salida', type: 'time' },
      { key: 'arrivalTime', label: 'Hora de llegada', type: 'time' },
      { key: 'trainNumber', label: 'Número de tren', type: 'text' }
    ]
  },
  ferry: {
    id: 'ferry',
    label: 'Ferry',
    icon: '⛴️',
    color: '#1f7a8c',
    fields: [
      { key: 'origin', label: 'Origen', type: 'text' },
      { key: 'destination', label: 'Destino', type: 'text' },
      { key: 'departureTime', label: 'Hora de salida', type: 'time' },
      { key: 'arrivalTime', label: 'Hora de llegada', type: 'time' },
      { key: 'operator', label: 'Naviera / Operador', type: 'text' }
    ]
  },
  transfer: {
    id: 'transfer',
    label: 'Traslado',
    icon: '🚕',
    color: '#c28840',
    fields: [
      { key: 'origin', label: 'Origen', type: 'text' },
      { key: 'destination', label: 'Destino', type: 'text' },
      { key: 'estimatedTime', label: 'Hora estimada', type: 'time' }
    ]
  },
  hotel: {
    id: 'hotel',
    label: 'Hotel',
    icon: '🏨',
    color: '#8a4a7c',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text' },
      { key: 'location', label: 'Ubicación', type: 'text' },
      { key: 'checkIn', label: 'Check-in', type: 'time' },
      { key: 'checkOut', label: 'Check-out', type: 'time' }
    ]
  },
  activity: {
    id: 'activity',
    label: 'Actividad',
    icon: '🎭',
    color: '#a8453f',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'time', label: 'Hora', type: 'time' },
      { key: 'location', label: 'Lugar', type: 'text' }
    ]
  }
}

// Campos comunes a todos los eventos
export const COMMON_FIELDS = [
  { key: 'cost', label: 'Costo', type: 'number' },
  { key: 'mapLocation', label: 'Ubicación en Maps', type: 'text', placeholder: 'Dirección o lugar' },
  { key: 'attachment', label: 'Adjunto (PDF/imagen)', type: 'file' }
]

// Devuelve la hora de inicio principal del evento (para ordenar cronológicamente)
export function getEventStartTime(event) {
  const t = event.data || {}
  return t.departureTime || t.checkIn || t.time || t.estimatedTime || '00:00'
}

export function formatDateISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysBetween(startISO, endISO) {
  const start = parseISO(startISO)
  const end = parseISO(endISO)
  const days = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push(formatDateISO(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function monthLabel(year, month) {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${meses[month]} ${year}`
}

export function weekdayShort(dayIndex) {
  // lunes primero
  return ['L','M','M','J','V','S','D'][dayIndex]
}

// Convierte Date.getDay() (0=domingo) a índice lunes-primero
export function mondayFirstIndex(date) {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

// Paleta amplia para destinos
export const DESTINATION_COLOR_PALETTE = [
  '#dc2626', '#ea580c', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#0d9488', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#be185d', '#7c2d12', '#a16207',
  '#475569', '#1f2937', '#0f172a', '#78350f', '#365314'
]

export const DESTINATION_COLORS = DESTINATION_COLOR_PALETTE

export function destinationRanges(dest) {
  if (!dest) return []
  if (Array.isArray(dest.ranges) && dest.ranges.length) {
    return dest.ranges.filter((r) => r && r.startDate && r.endDate)
  }
  if (dest.startDate && dest.endDate) {
    return [{ startDate: dest.startDate, endDate: dest.endDate }]
  }
  return []
}

export function destinationCoversDate(dest, iso) {
  return destinationRanges(dest).some((r) => iso >= r.startDate && iso <= r.endDate)
}

export function destinationDateSummary(dest) {
  const ranges = destinationRanges(dest)
  if (!ranges.length) return ''
  return ranges
    .map((r) => `${r.startDate} → ${r.endDate}`)
    .join(' · ')
}

// Devuelve los splits normalizados de un evento (array de {walletId, amount})
// Soporta el formato viejo (paidBy = string)
export function getEventSplits(event) {
  const pb = event?.data?.paidBy
  if (!pb) return []
  if (Array.isArray(pb)) {
    return pb
      .map((s) => ({ walletId: s.walletId, amount: parseFloat(s.amount) }))
      .filter((s) => s.walletId && Number.isFinite(s.amount) && s.amount > 0)
  }
  if (typeof pb === 'string') {
    const cost = parseFloat(event.data?.cost)
    return [{ walletId: pb, amount: Number.isFinite(cost) ? cost : 0 }]
  }
  return []
}

// Calcula gastos descontados de una billetera y saldo disponible
// (incluye costos de eventos asignados + gastos manuales cargados en la billetera)
export function computeWalletBalance(wallet, events) {
  let spent = 0
  for (const e of events || []) {
    for (const s of getEventSplits(e)) {
      if (s.walletId === wallet.id) spent += s.amount
    }
  }
  for (const exp of wallet.manualExpenses || []) {
    const amount = parseFloat(exp.amount)
    if (Number.isFinite(amount)) spent += amount
  }
  const initial = Number(wallet.initialBalance) || 0
  return { spent, balance: initial - spent }
}

// Migra datos viejos al formato actual:
// - destinations: startDate/endDate -> ranges:[{startDate,endDate}]
// - eventos hotel: price -> cost
// - notes / wallets: array vacio si no existen
export function migrateData(data) {
  if (!data || typeof data !== 'object') {
    return { destinations: [], events: [], notes: [], wallets: [] }
  }
  const destinations = (data.destinations || []).map((d) => {
    let ranges = Array.isArray(d.ranges) && d.ranges.length
      ? d.ranges.filter((r) => r && r.startDate && r.endDate)
      : []
    if (!ranges.length && d.startDate && d.endDate) {
      ranges = [{ startDate: d.startDate, endDate: d.endDate }]
    }
    return {
      id: d.id,
      name: d.name,
      color: d.color,
      ranges
    }
  })
  const events = (data.events || []).map((e) => {
    const evData = { ...(e.data || {}) }
    if (e.type === 'hotel' && evData.price != null && evData.price !== '' && (evData.cost == null || evData.cost === '')) {
      evData.cost = evData.price
    }
    delete evData.price
    if (typeof evData.paidBy === 'string' && evData.paidBy) {
      const cost = parseFloat(evData.cost)
      evData.paidBy = [{ walletId: evData.paidBy, amount: Number.isFinite(cost) ? cost : 0 }]
    } else if (!Array.isArray(evData.paidBy)) {
      delete evData.paidBy
    }
    return { ...e, data: evData }
  })
  const notes = Array.isArray(data.notes) ? data.notes : []
  const wallets = Array.isArray(data.wallets)
    ? data.wallets.map((w) => ({
      id: w.id,
      name: w.name,
      color: w.color || '#3b82f6',
      initialBalance: Number(w.initialBalance) || 0,
      manualExpenses: Array.isArray(w.manualExpenses)
        ? w.manualExpenses
          .map((exp) => ({
            id: exp.id,
            label: exp.label || '',
            amount: Number(exp.amount) || 0,
            createdAt: exp.createdAt || null
          }))
          .filter((exp) => exp.id && exp.label)
        : []
    }))
    : []
  return { destinations, events, notes, wallets }
}
