import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { findRegistryBySocial } from '../../lib/joiners';
import { fmt } from '../../lib/format';
import EmptyState from '../shared/EmptyState';

export default function JoinersTab({ onPickJoiner }) {
  const { items, registry } = useApp();

  const entries = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      if (!map[it.joiner]) map[it.joiner] = { count: 0, total: 0, pending: 0 };
      map[it.joiner].count++;
      const total = (Number(it.valorItem) || 0) + (Number(it.valorFreteInter) || 0) + (Number(it.valorTaxa) || 0);
      map[it.joiner].total += total;
      [['valorItem', 'pagItem'], ['valorFreteInter', 'pagFreteInter'], ['valorTaxa', 'pagTaxa']].forEach(([v, p]) => {
        if (it[p] === 'PENDENTE' || it[p] === 'ATRASADO') map[it.joiner].pending += Number(it[v]) || 0;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [items]);

  if (entries.length === 0) {
    return <EmptyState title="Nenhum joiner ainda">Adicione itens para começar a organizar seus joiners.</EmptyState>;
  }

  return (
    <div className="joiner-grid">
      {entries.map(([handle, d]) => {
        const regMatch = findRegistryBySocial(registry, handle);
        return (
          <div key={handle} className="joiner-card" onClick={() => onPickJoiner(handle)}>
            <div className="joiner-handle">{handle}</div>
            {regMatch ? (
              <div className="joiner-sub">{regMatch.apelido}{regMatch.nomeCompleto ? ' — ' + regMatch.nomeCompleto : ''}</div>
            ) : (
              <div className="joiner-sub" style={{ color: 'var(--pink-deep)' }}>⚠ não cadastrado</div>
            )}
            <div className="joiner-sub">{d.count} {d.count === 1 ? 'item' : 'itens'}</div>
            <div className="joiner-total">Total: {fmt(d.total)}</div>
            <div className="joiner-total" style={{ color: 'var(--pink-deep)' }}>Pendente: {fmt(d.pending)}</div>
          </div>
        );
      })}
    </div>
  );
}
