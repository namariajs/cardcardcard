import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { interBoxForItem } from '../../lib/calc';
import { itemDisplayTitle } from '../../lib/format';
import InterBoxCard from '../inter/InterBoxCard';
import InterItemDetailModal from '../inter/InterItemDetailModal';
import ItemModal from '../items/ItemModal';
import EmptyState from '../shared/EmptyState';

export default function InterTab() {
  const { unlocked, items, interBoxes, createInterBox, updateInterBox } = useApp();
  const [selected, setSelected] = useState(new Set());
  const [assignTarget, setAssignTarget] = useState('');
  const [detailItemId, setDetailItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(undefined);

  const unassigned = useMemo(() => items.filter((it) => !interBoxForItem(interBoxes, it.id)), [items, interBoxes]);

  if (!unlocked) {
    return <EmptyState title="Modo GOM necessário">Você não tem acesso a essa página.</EmptyState>;
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleAssign() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (assignTarget) {
      updateInterBox(assignTarget, (b) => {
        const set = new Set(b.itemIds || []);
        ids.forEach((id) => set.add(id));
        return { itemIds: Array.from(set) };
      });
    } else {
      createInterBox(ids);
    }
    setSelected(new Set());
    setAssignTarget('');
  }

  return (
    <>
      <div className="panel-intro">
        <h3>🌍 Caixas Internacionais</h3>
        <p>Selecione itens abaixo e agrupe-os numa caixa de envio internacional. Depois, quebre o valor total da caixa por categoria (ex: Photocard, Merch) — cada categoria tem um valor que você define, e a soma delas é o total da caixa.</p>
      </div>

      <div className="gom-claims-box">
        <h3>📦 Itens sem caixa internacional</h3>
        <p>{unassigned.length} {unassigned.length === 1 ? 'item' : 'itens'} ainda não {unassigned.length === 1 ? 'associado' : 'associados'} a uma caixa internacional.</p>
        {unassigned.length === 0 ? (
          <div className="empty" style={{ marginTop: 10 }}><b>Tudo associado! 🎉</b>Todos os itens já estão em alguma caixa internacional.</div>
        ) : (
          <>
            <div className="registry-grid" style={{ marginTop: 10 }}>
              {unassigned.map((it) => (
                <label className="reg-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }} key={it.id}>
                  <input type="checkbox" style={{ marginTop: 3 }} checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />
                  <div>
                    <div className="reg-name" style={{ fontSize: 14 }}>{itemDisplayTitle(it)}</div>
                    <div className="reg-row"><b>Joiner:</b> {it.joiner}</div>
                    <div className="reg-row"><b>CEG:</b> {it.ceg || '—'}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="panel-toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
              <select value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)}>
                <option value="">+ Nova caixa internacional</option>
                {interBoxes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className="btn btn-primary" onClick={handleAssign}>📦 Adicionar à caixa</button>
            </div>
          </>
        )}
      </div>

      {interBoxes.length === 0 ? (
        <EmptyState title="Nenhuma caixa internacional criada ainda">Selecione itens acima e crie a primeira caixa.</EmptyState>
      ) : (
        interBoxes.map((box) => (
          <InterBoxCard key={box.id} box={box} onOpenItemDetail={setDetailItemId} />
        ))
      )}

      {detailItemId && (() => {
        const item = items.find((i) => i.id === detailItemId);
        return item ? (
          <InterItemDetailModal
            item={item}
            onClose={() => setDetailItemId(null)}
            onEdit={(id) => { setDetailItemId(null); setEditingItemId(id); }}
          />
        ) : null;
      })()}
      {editingItemId !== undefined && <ItemModal itemId={editingItemId} onClose={() => setEditingItemId(undefined)} />}
    </>
  );
}
