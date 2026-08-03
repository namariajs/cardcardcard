export default function Modal({ onClose, maxWidth = 560, children }) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="modal" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
