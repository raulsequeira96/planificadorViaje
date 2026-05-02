import { useRef, useState } from 'react'
import { uid } from '../lib/events'

export default function NotesPanel({ notes, onSave, onDelete, showToast }) {
  const [editing, setEditing] = useState(null) // null | 'new' | note
  const [viewing, setViewing] = useState(null) // null | note

  function handleSave(note) {
    onSave(note)
    setEditing(null)
    if (showToast) {
      const isNew = !notes.find((n) => n.id === note.id)
      showToast(isNew ? 'Nota creada' : 'Nota actualizada', 'success')
    }
  }

  function handleDelete(id) {
    onDelete(id)
    if (showToast) showToast('Nota eliminada', 'success')
  }

  return (
    <div className="panel-card">
      <h3>
        Notas
        <span className="count">{notes.length}</span>
      </h3>

      {notes.length === 0 && !editing && (
        <div className="empty-state">Aun no hay notas</div>
      )}

      <div className="notes-list">
        {notes.map((n) => (
          <div
            key={n.id}
            className="note-item"
            onClick={() => setViewing(n)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setViewing(n) }}
          >
            <div className="note-info">
              <div className="note-title">{n.title || 'Sin titulo'}</div>
              {n.description && (
                <div className="note-preview">{n.description}</div>
              )}
              {n.attachments?.length > 0 && (
                <div className="note-attachments-count">
                  📎 {n.attachments.length} {n.attachments.length === 1 ? 'adjunto' : 'adjuntos'}
                </div>
              )}
            </div>
            <div className="note-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setEditing(n)}
                title="Editar"
              >
                ✎
              </button>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => handleDelete(n.id)}
                title="Eliminar"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {!editing && (
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
          onClick={() => setEditing('new')}
        >
          + Agregar nota
        </button>
      )}

      {editing && (
        <NoteEditorModal
          existing={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {viewing && (
        <NoteViewerModal
          note={viewing}
          onEdit={() => { setEditing(viewing); setViewing(null) }}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

function NoteEditorModal({ existing, onSave, onClose }) {
  const [title, setTitle] = useState(existing?.title || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [attachments, setAttachments] = useState(existing?.attachments || [])
  const fileInputRef = useRef(null)

  function handleFiles(files) {
    if (!files || !files.length) return
    const arr = Array.from(files)
    arr.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            id: uid(),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: reader.result
          }
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  function removeAttachment(id) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle && !description.trim() && attachments.length === 0) return
    onSave({
      id: existing?.id || uid(),
      title: trimmedTitle,
      description: description.trim(),
      attachments,
      updatedAt: new Date().toISOString()
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{existing ? 'Editar nota' : 'Nueva nota'}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Titulo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Documentos del vuelo"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notas, recordatorios, etc."
              />
            </div>
            <div className="form-group">
              <label>Adjuntos (PDF / imagenes)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
                style={{ display: 'none' }}
              />
              <div className="note-attachments-grid">
                {attachments.map((a) => (
                  <div key={a.id} className="note-attachment-chip">
                    <span className="file-icon">{a.type?.startsWith('image') ? '🖼️' : '📄'}</span>
                    <span className="file-name" title={a.name}>{a.name}</span>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeAttachment(a.id)}
                      title="Quitar"
                    >×</button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost file-select-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginTop: 8 }}
              >
                + Agregar archivo
              </button>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function NoteViewerModal({ note, onEdit, onClose }) {
  function downloadAttachment(a) {
    if (!a?.dataUrl) return
    const link = document.createElement('a')
    link.href = a.dataUrl
    link.download = a.name || 'adjunto'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function openAttachment(a) {
    if (!a?.dataUrl) return
    const win = window.open()
    if (!win) return
    if (a.type?.startsWith('image')) {
      win.document.write(`<title>${a.name}</title><img src="${a.dataUrl}" style="max-width:100%">`)
    } else {
      win.location.href = a.dataUrl
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{note.title || 'Sin titulo'}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {note.description && (
            <div className="note-view-description">{note.description}</div>
          )}
          {note.attachments?.length > 0 && (
            <div className="note-view-attachments">
              {note.attachments.map((a) => (
                <div key={a.id} className="note-view-attachment">
                  {a.type?.startsWith('image') ? (
                    <img src={a.dataUrl} alt={a.name} className="note-view-image" />
                  ) : (
                    <div className="note-view-pdf">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{a.name}</span>
                    </div>
                  )}
                  <div className="note-view-attachment-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => openAttachment(a)}>Ver</button>
                    <button type="button" className="btn btn-ghost" onClick={() => downloadAttachment(a)}>Descargar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            <button type="button" className="btn btn-primary" onClick={onEdit}>Editar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
