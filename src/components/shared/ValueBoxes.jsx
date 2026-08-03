import { fmt, hasVal, pagClass, isInterItem } from '../../lib/format';

function PayBadge({ status, value }) {
  if (!hasVal(value)) return null;
  return <span className={`badge ${pagClass(status)}`}>{status}</span>;
}

export default function ValueBoxes({ item }) {
  const boxes = [];
  if (hasVal(item.valorItem)) boxes.push({ label: 'Item', value: item.valorItem, status: item.pagItem });
  if (isInterItem(item)) {
    if (hasVal(item.valorFreteInter)) boxes.push({ label: 'Frete Inter', value: item.valorFreteInter, status: item.pagFreteInter });
    if (hasVal(item.valorTaxa)) boxes.push({ label: 'Taxa', value: item.valorTaxa, status: item.pagTaxa });
  }
  if (boxes.length === 0) return null;

  return (
    <div className="values" style={{ gridTemplateColumns: `repeat(${boxes.length},1fr)` }}>
      {boxes.map((b) => (
        <div className="val-box" key={b.label}>
          <span className="lbl">{b.label}</span>
          <span className="amt">{fmt(b.value)}</span>
          <span style={{ display: 'block', marginTop: 4 }}>
            <PayBadge status={b.status} value={b.value} />
          </span>
        </div>
      ))}
    </div>
  );
}
