import { useApp } from '../../context/AppContext';
import { itemDisplayTitle, statusLabel, fmt, hasVal, pagClass, isInterItem } from '../../lib/format';

export default function ItemRow({ item, onEdit, onDelete }) {
  const { unlocked } = useApp();
  return (
    <tr>
      <td>
        <b>{itemDisplayTitle(item)}</b>
        {unlocked && <><br /><span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{item.id}</span></>}
      </td>
      <td>{item.joiner}</td>
      <td>{item.ceg}</td>
      <td>{hasVal(item.valorItem) ? <>{fmt(item.valorItem)} <span className={`badge ${pagClass(item.pagItem)}`}>{item.pagItem}</span></> : '—'}</td>
      <td>{isInterItem(item) && hasVal(item.valorFreteInter) ? <>{fmt(item.valorFreteInter)} <span className={`badge ${pagClass(item.pagFreteInter)}`}>{item.pagFreteInter}</span></> : '—'}</td>
      <td>{isInterItem(item) && hasVal(item.valorTaxa) ? <>{fmt(item.valorTaxa)} <span className={`badge ${pagClass(item.pagTaxa)}`}>{item.pagTaxa}</span></> : '—'}</td>
      <td>{statusLabel('statusCeg', item.statusCeg)} / {statusLabel('statusEnvio', item.statusEnvio)}</td>
      <td>
        {unlocked && (
          <>
            <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => onEdit(item.id)}>✎</button>{' '}
            <button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => onDelete(item.id)}>🗑</button>
          </>
        )}
      </td>
    </tr>
  );
}
