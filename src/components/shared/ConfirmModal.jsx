import Modal from './Modal';

export default function ConfirmModal({ title = 'Confirmar', message = '', confirmLabel = 'Remover', onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} maxWidth={400}>
      <h3>{title}</h3>
      <p className="hint" style={{ marginBottom: 20 }}>{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-danger" onClick={() => { onConfirm?.(); }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
