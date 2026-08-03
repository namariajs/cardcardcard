import { useApp } from '../../context/AppContext';
import { itemDisplayTitle } from '../../lib/format';
import { shippingRequestFor } from '../../lib/calc';
import PhotoThumb from '../shared/PhotoThumb';

export default function FreteItemCard({ item, checked, onToggle }) {
  const { unlocked, shippingRequests } = useApp();
  const req = shippingRequestFor(shippingRequests, item.id);
  const disabled = !!req;

  let statusBadge = <span className="badge neutral">Liberado para envio</span>;
  if (req) {
    statusBadge = req.status === 'PENDENTE'
      ? <span className="badge pendente">🕓 Aguardando processamento</span>
      : <span className="badge pago">✔ Processado — Verifique a aba Pagamentos para o valor final do frete nacional{req.pagFrete === 'PAGO' ? ' (já pago)' : ''}</span>;
  }
  const trackingBadge = (req && req.status === 'PROCESSADO' && req.pagFrete === 'PAGO' && req.rastreio)
    ? <span className="badge pago">📮 Rastreio: {req.rastreio}</span> : null;

  return (
    <div className="item-card" style={disabled ? { opacity: 0.6 } : undefined}>
      <PhotoThumb item={item} />
      <div className="item-content">
        <div className="item-top">
          <div>
            <div className="item-name">{itemDisplayTitle(item)}</div>
            {unlocked && <div className="item-id mono">{item.id}</div>}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" disabled={disabled} checked={checked} onChange={onToggle} />
          </label>
        </div>
        <div className="meta-row"><b>CEG:</b> {item.ceg || '—'}</div>
        <div className="badges">{statusBadge}{trackingBadge}</div>
      </div>
    </div>
  );
}
