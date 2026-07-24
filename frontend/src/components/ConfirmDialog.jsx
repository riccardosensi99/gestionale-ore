// Dialog di conferma per azioni non reversibili.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn${danger ? ' danger' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Attendi…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
