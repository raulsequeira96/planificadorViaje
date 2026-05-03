import { useState } from 'react'
import { uid, computeWalletBalance, DESTINATION_COLOR_PALETTE } from '../lib/events'
import CollapsibleCard from './CollapsibleCard'

const WALLET_COLORS = DESTINATION_COLOR_PALETTE

function fmt(value) {
  return `$${(Number(value) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}

export default function WalletPanel({ wallets, events, onAddWallet, onEditWallet, onDeleteWallet, showToast }) {
  const [form, setForm] = useState(null) // null | 'new' | wallet

  function handleSave(payload) {
    if (form && form !== 'new' && form.id) {
      onEditWallet(form.id, payload)
      showToast?.('Billetera actualizada', 'success')
    } else {
      onAddWallet({ id: uid(), ...payload })
      showToast?.('Billetera creada', 'success')
    }
    setForm(null)
  }

  function handleDelete(id) {
    if (!confirm('¿Eliminar esta billetera? Los gastos asociados quedaran sin asignar.')) return
    onDeleteWallet(id)
    showToast?.('Billetera eliminada', 'success')
  }

  return (
    <CollapsibleCard storageKey="wallets" title="Billeteras" count={wallets.length}>
      {wallets.length === 0 && !form && (
        <div className="empty-state">Aun no hay billeteras</div>
      )}

      <div className="wallet-list">
        {wallets.map((w) => {
          const { spent, balance } = computeWalletBalance(w, events)
          const initial = Number(w.initialBalance) || 0
          const isLow = balance < 0
          const availablePct = initial > 0
            ? Math.max(0, Math.min(100, (balance / initial) * 100))
            : (initial === 0 && spent === 0 ? 100 : 0)
          return (
            <div key={w.id} className="wallet-item">
              <div className="wallet-head">
                <div className="wallet-name-row">
                  <span className="wallet-dot" style={{ background: w.color }} />
                  <span className="wallet-name">{w.name}</span>
                </div>
                <div className="wallet-actions">
                  <button className="btn btn-ghost btn-icon" onClick={() => setForm(w)} title="Editar">✎</button>
                  <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(w.id)} title="Eliminar">×</button>
                </div>
              </div>
              <div className="wallet-balance-row">
                <span className="wallet-balance-label">Disponible</span>
                <span className={`wallet-balance ${isLow ? 'wallet-balance-low' : ''}`}>{fmt(balance)}</span>
              </div>
              <div className={`wallet-bar ${isLow ? 'wallet-bar-overdrawn' : ''}`}>
                <div className="wallet-bar-fill" style={{ width: `${availablePct}%` }} />
              </div>
              <div className="wallet-meta">
                <span>Inicial: {fmt(initial)}</span>
                <span>Gastado: {fmt(spent)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {form ? (
        <WalletForm
          initial={form === 'new' ? null : form}
          onSave={handleSave}
          onCancel={() => setForm(null)}
        />
      ) : (
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
          onClick={() => setForm('new')}
        >
          + Agregar billetera
        </button>
      )}
    </CollapsibleCard>
  )
}

function WalletForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || WALLET_COLORS[0])
  const [initialBalance, setInitialBalance] = useState(
    initial?.initialBalance != null ? String(initial.initialBalance) : ''
  )

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const balance = parseFloat(initialBalance)
    onSave({
      name: trimmed,
      color,
      initialBalance: Number.isFinite(balance) ? balance : 0
    })
  }

  return (
    <form onSubmit={handleSubmit} className="destination-form" style={{ marginTop: 12 }}>
      <div className="form-section-title">{initial ? 'Editar billetera' : 'Nueva billetera'}</div>

      <div className="form-group">
        <label>Nombre</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Juan, Maria..."
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>Color</label>
        <div className="color-swatches">
          {WALLET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch ${color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Saldo inicial</label>
        <input
          type="number"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Guardar cambios' : 'Crear'}
        </button>
      </div>
    </form>
  )
}
