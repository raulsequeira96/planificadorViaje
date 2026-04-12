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
      { key: 'checkOut', label: 'Check-out', type: 'time' },
      { key: 'price', label: 'Precio', type: 'number' }
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

// Paleta para destinos
export const DESTINATION_COLORS = [
  '#c2410c', '#0369a1', '#15803d', '#7c2d12', '#6d28d9',
  '#be185d', '#0f766e', '#a16207', '#1e40af', '#b91c1c'
]
