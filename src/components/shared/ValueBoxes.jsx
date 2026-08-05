import { fmt, hasVal, pagClass, isInterItem } from '../../lib/format';
import { PAYMENT_FIELDS_BY_KEY } from '../../lib/constants';
import { paymentFieldEffective } from '../../lib/calc';

export default function ValueBoxes({ item, unclaimedView }) {
  const boxes = [];
  if (hasVal(item.valorItem)) boxes.push({ label: 'Item', eff: paymentFieldEffective(item, PAYMENT_FIELDS_BY_KEY.item) });
  if (isInterItem(item)) {
    if (hasVal(item.valorFreteInter)) boxes.push({ label: 'Frete Inter', eff: paymentFieldEffective(item, PAYMENT_FIELDS_BY_KEY.freteInter) });
    if (hasVal(item.valorTaxa)) boxes.push({ label: 'Taxa', eff: paymentFieldEffective(item, PAYMENT_FIELDS_BY_KEY.taxa) });
  }
  if (boxes.length === 0) return null;

  return (
    <div className="values" style={{ gridTemplateColumns: `repeat(${boxes.length},1fr)` }}>
      {boxes.map((b) => (
        <div className="val-box" key={b.label}>
          <span className="lbl">{b.label}</span>
          <span className={`amt${unclaimedView ? ' amt-lg' : ''}`}>{fmt(b.eff.total)}</span>
          {b.eff.fee > 0 && (
            <span className="late-fee-note">
              + {fmt(b.eff.fee)} de atraso ({b.eff.lateDays} {b.eff.lateDays === 1 ? 'dia' : 'dias'})
            </span>
          )}
          {!unclaimedView && (
            <span className="val-box-badge">
              <span className={`badge ${pagClass(b.eff.status)}`}>{b.eff.status}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
