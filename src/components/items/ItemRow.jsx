import { useApp } from '../../context/AppContext';
import { itemDisplayTitle, statusLabel, isInterItem } from '../../lib/format';
import PaymentFieldCell from '../shared/PaymentFieldCell';

export default function ItemRow({ item, selected, onToggleSelect, onEdit, onDelete, onDuplicate }) {
  const { unlocked } = useApp();
  return (
    <tr>
      {unlocked && (
        <td><input type="checkbox" checked={selected} onChange={() => onToggleSelect(item.id)} /></td>
      )}
      <td>
        <b>{itemDisplayTitle(item)}</b>
        {unlocked && <><br /><span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{item.id}</span></>}
      </td>
      <td>{item.unclaimed ? '🟢 Disponível' : item.joiner}</td>
      <td>{item.ceg}</td>
      <td><PaymentFieldCell item={item} fieldKey="item" /></td>
      <td><PaymentFieldCell item={item} fieldKey="freteInter" visible={isInterItem(item)} /></td>
      <td><PaymentFieldCell item={item} fieldKey="taxa" visible={isInterItem(item)} /></td>
      <td>{statusLabel('statusCeg', item.statusCeg)} / {statusLabel('statusEnvio', item.statusEnvio)}</td>
      <td>
        {unlocked && (
          <>
            <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => onEdit(item.id)}>✎</button>{' '}
            <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => onDuplicate(item)}>⧉</button>{' '}
            <button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => onDelete(item.id)}>🗑</button>
          </>
        )}
      </td>
    </tr>
  );
}
