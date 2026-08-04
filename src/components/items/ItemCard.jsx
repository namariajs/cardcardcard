import { useApp } from '../../context/AppContext';
import { findRegistryBySocial } from '../../lib/joiners';
import { itemDisplayTitle, statusLabel } from '../../lib/format';
import PhotoThumb from '../shared/PhotoThumb';
import ValueBoxes from '../shared/ValueBoxes';

export default function ItemCard({ item, showJoinerBadge, onEdit, onDelete, onDuplicate }) {
  const { registry, unlocked } = useApp();
  const regMatch = showJoinerBadge ? findRegistryBySocial(registry, item.joiner) : null;

  return (
    <div className="item-card">
      <span className="ceg-chip">{(item.ceg || '').split(' ').slice(0, 2).join(' ')}</span>
      <PhotoThumb item={item} />
      <div className="item-content">
        <div className="item-top">
          <div>
            <div className="item-name">{itemDisplayTitle(item)}</div>
            {unlocked && <div className="item-id mono">{item.id}</div>}
          </div>
          {showJoinerBadge && (
            item.unclaimed
              ? <span className="item-joiner unclaimed">🟢 Disponível</span>
              : <span className="item-joiner">{item.joiner}{regMatch ? '' : ' ⚠'}</span>
          )}
        </div>
        {showJoinerBadge && !item.unclaimed && regMatch && (
          <div className="meta-row" style={{ marginTop: -4 }}>
            <b>{regMatch.apelido}</b>{unlocked && regMatch.nomeCompleto ? ' — ' + regMatch.nomeCompleto : ''}
          </div>
        )}
        {showJoinerBadge && !item.unclaimed && !regMatch && (
          <div className="meta-row" style={{ marginTop: -4, color: 'var(--pink-deep)' }}>Joiner não cadastrado</div>
        )}
        <div className="meta-row"><b>Loja/POB:</b> {item.loja || '—'}</div>
        <div className="badges">
          {item.category && item.category !== '-' && <span className="badge neutral">{statusLabel('category', item.category)}</span>}
          {item.grupo && item.grupo !== '-' && <span className="badge neutral">{item.grupo}</span>}
          <span className="badge neutral">CEG: {statusLabel('statusCeg', item.statusCeg)}</span>
          <span className="badge neutral">Envio: {statusLabel('statusEnvio', item.statusEnvio)}</span>
          {item.caixa && item.caixa !== '-' && <span className="badge neutral">📦 {item.caixa}</span>}
        </div>
        <ValueBoxes item={item} />
        {unlocked && (
          <div className="card-actions">
            <button className="btn btn-ghost" onClick={() => onEdit(item.id)}>✎ Editar</button>
            <button className="btn btn-ghost" onClick={() => onDuplicate(item)}>⧉ Duplicar</button>
            <button className="btn btn-danger" onClick={() => onDelete(item.id)}>🗑 Remover</button>
          </div>
        )}
      </div>
    </div>
  );
}
