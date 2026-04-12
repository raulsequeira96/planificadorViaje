import { useState, useEffect } from 'react'
import { EVENT_TYPES, COMMON_FIELDS, uid } from '../lib/events'

export default function EventForm({ date, existing, onSave, onCancel }) {
  const [type, setType] = useState(existing?.type || 'flight')
  const [data, setData] = useState(existing?.data || {})
  const [attachment, setAttachment] = useState(existing?.attachment || null)

  useEffect(() => {
    if (!existing) {
      // Reset data al cambiar tipo (solo en creación)
      setData({})
    }
  }, [type])

  function handleFile(file) {
    if (!file) { setAttachment(null); return }
    const reader = new FileReader()
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result
      })
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const event = {
      id: existing?.id || uid(),
      type,
      date,
      data,
      attachment
    }
    onSave(event)
  }

  const typeConfig = EVENT_TYPES[type]

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Tipo de evento</label>
        <div className="type-selector">
          {Object.values(EVENT_TYPES).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`type-option ${type === t.id ? 'selected' : ''}`}
              onClick={() => setType(t.id)}
            >
              <span className="emoji">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {typeConfig.fields.map((field) => (
        <div key={field.key} className="form-group">
          <label>{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea
              rows={3}
              value={data[field.key] || ''}
              onChange={(e) => setData({ ...data, [field.key]: e.target.value })}
            />
          ) : (
            <input
              type={field.type}
              value={data[field.key] || ''}
              onChange={(e) => setData({ ...data, [field.key]: e.target.value })}
            />
          )}
        </div>
      ))}

      <div className="divider" />

      {COMMON_FIELDS.map((field) => {
        if (field.type === 'file') {
          return (
            <div key={field.key} className="form-group">
              <label>{field.label}</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {attachment && (
                <div className="attachment-preview">
                  <span className="file-icon">{attachment.type?.startsWith('image') ? '🖼️' : '📄'}</span>
                  <span style={{ flex: 1 }}>{attachment.name}</span>
                  <button type="button" className="btn-icon" onClick={() => setAttachment(null)}>×</button>
                </div>
              )}
            </div>
          )
        }
        return (
          <div key={field.key} className="form-group">
            <label>{field.label}</label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={data[field.key] || ''}
              onChange={(e) => setData({ ...data, [field.key]: e.target.value })}
            />
          </div>
        )
      })}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Guardar</button>
      </div>
    </form>
  )
}
