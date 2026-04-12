import { useEffect } from 'react'

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 3000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div className={`toast toast-${toast.type || 'info'}`}>
      <span className="toast-icon">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}
      </span>
      <span className="toast-msg">{toast.message}</span>
      {toast.undoAction && (
        <button
          className="toast-undo"
          onClick={() => {
            toast.undoAction()
            onDismiss(toast.id)
          }}
        >
          Deshacer
        </button>
      )}
      <button className="toast-close" onClick={() => onDismiss(toast.id)}>×</button>
    </div>
  )
}
