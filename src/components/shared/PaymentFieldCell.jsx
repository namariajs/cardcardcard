import { fmt, hasVal, pagClass } from '../../lib/format';
import { PAYMENT_FIELDS_BY_KEY } from '../../lib/constants';
import { paymentFieldEffective } from '../../lib/calc';

export default function PaymentFieldCell({ item, fieldKey, visible = true }) {
  const fieldDef = PAYMENT_FIELDS_BY_KEY[fieldKey];
  if (!visible || !hasVal(item[fieldDef.valField])) return '—';
  const eff = paymentFieldEffective(item, fieldDef);
  return (
    <>
      {fmt(eff.total)} <span className={`badge ${pagClass(eff.status)}`}>{eff.status}</span>
      {eff.fee > 0 && (
        <span className="late-fee-note" style={{ display: 'block' }}>
          + {fmt(eff.fee)} de atraso ({eff.lateDays} {eff.lateDays === 1 ? 'dia' : 'dias'})
        </span>
      )}
    </>
  );
}
