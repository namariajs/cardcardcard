import { formatDateOnly } from '../../lib/format';

export default function PackageBlock({ req, itemCount, onClick }) {
  return (
    <div className="item-card package-card" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div className="item-content">
        <div className="item-top">
          <div><div className="item-name">📦 Pacote enviado — {itemCount} {itemCount === 1 ? 'item' : 'itens'}</div></div>
        </div>
        <div className="badges">
          <span className="badge pago">📮 Rastreio: {req.rastreio}</span>
          {req.rastreioAt && <span className="badge neutral">Adicionado em {formatDateOnly(req.rastreioAt)}</span>}
        </div>
      </div>
    </div>
  );
}
