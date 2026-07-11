import { useState } from 'react'
import { uid, computeWalletBalance, getEventSplits, DESTINATION_COLOR_PALETTE } from '../lib/events'
import CollapsibleCard from './CollapsibleCard'

const WALLET_COLORS = DESTINATION_COLOR_PALETTE

function fmt(value) {
  return `$${(Number(value) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}

export default function WalletPanel({ wallets, events, onAddWallet, onEditWallet, onDeleteWallet, showToast }) {
  const [form, setForm] = useState(null) // null | 'new' | wallet
  const [expenseFormId, setExpenseFormId] = useState(null) // id de billetera con el form de gasto abierto

  function handleSave(payload) {
    if (form && form !== 'new' && form.id) {
      onEditWallet(form.id, payload)
      showToast?.('Billetera actualizada', 'success')
    } else {
      onAddWallet({ id: uid(), manualExpenses: [], ...payload })
      showToast?.('Billetera creada', 'success')
    }
    setForm(null)
  }

  function handleDelete(id) {
    if (!confirm('¿Eliminar esta billetera? Los gastos asociados quedaran sin asignar.')) return
    onDeleteWallet(id)
    showToast?.('Billetera eliminada', 'success')
  }

  function handleAddExpense(wallet, { label, amount }) {
    const expense = { id: uid(), label, amount, createdAt: new Date().toISOString() }
    onEditWallet(wallet.id, { manualExpenses: [...(wallet.manualExpenses || []), expense] })
    showToast?.('Gasto agregado', 'success')
    setExpenseFormId(null)
  }

  function handleDeleteExpense(wallet, expenseId) {
    onEditWallet(wallet.id, { manualExpenses: (wallet.manualExpenses || []).filter((e) => e.id !== expenseId) })
  }

  function handleResetSpent(wallet) {
    const hasEventCosts = events.some((e) => getEventSplits(e).some((s) => s.walletId === wallet.id))
    const extra = hasEventCosts
      ? ' Los gastos cargados desde eventos (vuelos, hoteles, etc.) no se ven afectados, solo los gastos manuales.'
      : ''
    if (!confirm(`¿Resetear los gastos manuales de "${wallet.name}"? Esta acción no se puede deshacer.${extra}`)) return
    onEditWallet(wallet.id, { manualExpenses: [] })
    showToast?.('Gastos reseteados', 'success')
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

              {w.manualExpenses?.length > 0 && (
                <div className="wallet-expense-list">
                  {w.manualExpenses.map((exp) => (
                    <div key={exp.id} className="wallet-expense-row">
                      <span className="wallet-expense-label">{exp.label}</span>
                      <span className="wallet-expense-amount">{fmt(exp.amount)}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleDeleteExpense(w, exp.id)}
                        title="Eliminar gasto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {expenseFormId === w.id ? (
                <ExpenseForm
                  onSave={(payload) => handleAddExpense(w, payload)}
                  onCancel={() => setExpenseFormId(null)}
                />
              ) : (
                <div className="wallet-expense-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setExpenseFormId(w.id)}
                  >
                    + Agregar gasto
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleResetSpent(w)}
                  >
                    ↺ Resetear gastado
                  </button>
                </div>
              )}
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

function ExpenseForm({ onSave, onCancel }) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmedLabel = label.trim()
    const parsedAmount = parseFloat(amount)
    if (!trimmedLabel || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    onSave({ label: trimmedLabel, amount: parsedAmount })
  }

  return (
    <form onSubmit={handleSubmit} className="destination-form" style={{ marginTop: 8 }}>
      <div className="form-group">
        <label>Leyenda</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Almuerzo, Souvenirs..."
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>Monto</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Agregar</button>
      </div>
    </form>
  )
}
