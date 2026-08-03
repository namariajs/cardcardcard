import Modal from './shared/Modal';
import EmptyState from './shared/EmptyState';

export default function CegModal({ items, onClose, onPickCeg }) {
  const cegMap = {};
  items.forEach((it) => {
    const c = (it.ceg || '').trim();
    if (!c || c === '-') return;
    cegMap[c] = (cegMap[c] || 0) + 1;
  });
  const cegs = Object.keys(cegMap).sort();

  return (
    <Modal onClose={onClose}>
      <h3>CEGs em andamento</h3>
      <p className="hint">Clique em um CEG para ver os itens dele.</p>
      {cegs.length === 0 ? (
        <EmptyState title="Nenhum CEG em andamento">Adicione itens com um CEG definido para vê-los aqui.</EmptyState>
      ) : (
        <div className="ceg-list">
          {cegs.map((c) => (
            <button key={c} className="ceg-list-item" onClick={() => { onPickCeg(c); onClose(); }}>
              <span>{c}</span>
              <span className="ceg-count">{cegMap[c]} {cegMap[c] === 1 ? 'item' : 'itens'}</span>
            </button>
          ))}
        </div>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}
