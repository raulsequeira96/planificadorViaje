import { useState } from 'react'

export default function CollapsibleCard({
  title,
  count,
  children,
  storageKey,
  defaultOpen = true,
  headerExtra
}) {
  const [open, setOpen] = useState(() => {
    if (!storageKey) return defaultOpen
    try {
      const saved = localStorage.getItem(`collapse:${storageKey}`)
      if (saved === '1') return true
      if (saved === '0') return false
    } catch {}
    return defaultOpen
  })

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      if (storageKey) {
        try { localStorage.setItem(`collapse:${storageKey}`, next ? '1' : '0') } catch {}
      }
      return next
    })
  }

  return (
    <div className={`panel-card collapsible-card ${open ? 'open' : 'collapsed'}`}>
      <h3 className="panel-card-header">
        <button
          type="button"
          className="collapse-toggle"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? 'Contraer' : 'Expandir'}
        >
          <span className={`collapse-icon ${open ? 'open' : ''}`} aria-hidden="true">▾</span>
          <span className="collapse-title">{title}</span>
        </button>
        <span className="panel-header-extra">
          {count !== undefined && count !== null && <span className="count">{count}</span>}
          {headerExtra}
        </span>
      </h3>
      {open && <div className="panel-card-body">{children}</div>}
    </div>
  )
}
