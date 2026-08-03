import { useApp } from '../../context/AppContext';
import { itemDisplayTitle, formatDateOnly } from '../../lib/format';
import PhotoThumb from '../shared/PhotoThumb';
import Modal from '../shared/Modal';

export default function PackageItemsModal({ requestId, onClose }) {
  const { items, unlocked, shippingRequests } = useApp();
  const req = shippingRequests.find((r) => r.id === requestId);
  if (!req) return null;
  const its = req.itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);

  return (
    <Modal onClose={onClose} maxWidth={640}>
      <h3>📦 Pacote enviado</h3>
      <p className="hint">📮 Rastreio: <span className="mono">{req.rastreio}</span>{req.rastreioAt ? ' · Adicionado em ' + formatDateOnly(req.rastreioAt) : ''}</p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {its.map((it) => (
          <div className="item-card" key={it.id}>
            <PhotoThumb item={it} />
            <div className="item-content">
              <div className="item-name">{itemDisplayTitle(it)}</div>
              {unlocked && <div className="item-id mono">{it.id}</div>}
              <div className="meta-row"><b>CEG:</b> {it.ceg || '—'}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-outline" type="button" onClick={() => window.open('https://rastreamento.correios.com.br/app/index.php?objetos=' + encodeURIComponent(req.rastreio), '_blank')}>
          🔗 Ver nos Correios
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}
