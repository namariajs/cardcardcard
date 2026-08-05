import { statusLabel, itemDisplayTitle } from '../../lib/format';
import PhotoThumb from '../shared/PhotoThumb';
import ValueBoxes from '../shared/ValueBoxes';
import Modal from '../shared/Modal';

export default function InterItemDetailModal({ item, onClose, onEdit }) {
  return (
    <Modal onClose={onClose} maxWidth={480}>
      <h3>{itemDisplayTitle(item)}</h3>
      <p className="hint">ID: <span className="mono">{item.id}</span></p>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <PhotoThumb item={item} size={110} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="meta-row"><b>Joiner:</b> {item.joiner}</div>
          <div className="meta-row"><b>CEG:</b> {item.ceg || '—'}</div>
          <div className="meta-row"><b>Loja/POB:</b> {item.loja || '—'}</div>
          <div className="badges" style={{ marginTop: 8 }}>
            {item.category && item.category !== '-' && <span className="badge neutral">{statusLabel('category', item.category)}</span>}
            {item.grupo && item.grupo !== '-' && <span className="badge neutral">{item.grupo}</span>}
            <span className="badge neutral">Status: {statusLabel('statusCeg', item.statusCeg)}</span>
            <span className="badge neutral">Envio: {statusLabel('statusEnvio', item.statusEnvio)}</span>
            {item.caixa && item.caixa !== '-' && <span className="badge neutral">📦 {item.caixa}</span>}
          </div>
        </div>
      </div>
      <ValueBoxes item={item} />
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        <button className="btn btn-primary" onClick={() => onEdit(item.id)}>✎ Editar item</button>
      </div>
    </Modal>
  );
}
