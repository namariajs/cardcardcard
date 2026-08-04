import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import ItemCard from '../items/ItemCard';
import ItemRow from '../items/ItemRow';
import ItemModal from '../items/ItemModal';
import SetModal from '../items/SetModal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';
import StyledSelect from '../shared/StyledSelect';
import { deletePhoto } from '../../lib/storage';
import { paymentFieldEffective } from '../../lib/calc';
import { PAYMENT_FIELDS } from '../../lib/constants';

export default function ItemsTab({ externalQuery, onExternalQueryConsumed, externalJoinerFilter, onExternalJoinerFilterConsumed }) {
  const { items, unlocked, removeItem } = useApp();
  const [query, setQuery] = useState('');
  const [joinerFilter, setJoinerFilter] = useState('');
  const [caixaFilter, setCaixaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [editingId, setEditingId] = useState(undefined); // undefined = closed, null = new item, string = edit
  const [deletingId, setDeletingId] = useState(null);
  const [duplicatingItem, setDuplicatingItem] = useState(null);
  const [creatingSet, setCreatingSet] = useState(false);

  useEffect(() => {
    if (externalQuery) { setQuery(externalQuery); onExternalQueryConsumed?.(); }
  }, [externalQuery, onExternalQueryConsumed]);

  useEffect(() => {
    if (externalJoinerFilter) { setJoinerFilter(externalJoinerFilter); onExternalJoinerFilterConsumed?.(); }
  }, [externalJoinerFilter, onExternalJoinerFilterConsumed]);

  const joiners = useMemo(() => [...new Set(items.map((i) => i.joiner))].filter(Boolean).sort(), [items]);
  const caixas = useMemo(() => [...new Set(items.map((i) => i.caixa).filter((c) => c && c !== '-'))].sort(), [items]);

  const joinerOptions = useMemo(() => [
    { value: '', label: 'Todos os joiners' },
    ...joiners.map((j) => ({ value: j, label: j })),
  ], [joiners]);
  const caixaOptions = useMemo(() => [
    { value: '', label: 'Todas as caixas' },
    ...caixas.map((c) => ({ value: c, label: `📦 ${c}` })),
  ], [caixas]);
  const statusOptions = [
    { value: '', label: 'Todos os pagamentos' },
    { value: 'PENDENTE', label: 'Pendentes' },
    { value: 'PAGO', label: 'Pagos' },
    { value: 'ATRASADO', label: 'Atrasados' },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchQ = !q || [it.joiner, it.itemName, it.ceg, it.id, it.loja, it.caixa, it.grupo, it.membro].join(' ').toLowerCase().includes(q);
      const matchJ = !joinerFilter || it.joiner === joinerFilter;
      const matchC = !caixaFilter || it.caixa === caixaFilter;
      const matchS = !statusFilter || PAYMENT_FIELDS.some((f) => paymentFieldEffective(it, f).status === statusFilter);
      return matchQ && matchJ && matchC && matchS;
    });
  }, [items, query, joinerFilter, caixaFilter, statusFilter]);

  async function handleDelete(id) {
    const it = items.find((i) => i.id === id);
    removeItem(id);
    if (it?.hasPhoto) await deletePhoto(id);
  }

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Buscar por joiner, item, CEG, ID..." style={{ minWidth: 220 }}
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <StyledSelect value={joinerFilter} onChange={setJoinerFilter} options={joinerOptions} placeholder="Todos os joiners" />
        <StyledSelect value={caixaFilter} onChange={setCaixaFilter} options={caixaOptions} placeholder="Todas as caixas" />
        <StyledSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder="Todos os pagamentos" />
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}>
          {viewMode === 'cards' ? '📋 Ver em lista' : '🗂 Ver em cards'}
        </button>
        {unlocked && (
          <>
            <button className="btn btn-ghost" onClick={() => setCreatingSet(true)}>🗂️ Novo Set</button>
            <button className="btn btn-primary" onClick={() => setEditingId(null)}>+ Adicionar item</button>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum item encontrado">Ajuste a busca ou os filtros, ou adicione um novo item.</EmptyState>
      ) : viewMode === 'cards' ? (
        <div className="grid">
          {filtered.map((it) => (
            <ItemCard key={it.id} item={it} showJoinerBadge onEdit={setEditingId} onDelete={setDeletingId} onDuplicate={setDuplicatingItem} />
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Item</th><th>Joiner</th><th>CEG</th><th>Item</th><th>Frete Inter</th><th>Taxa</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((it) => <ItemRow key={it.id} item={it} onEdit={setEditingId} onDelete={setDeletingId} onDuplicate={setDuplicatingItem} />)}
            </tbody>
          </table>
        </div>
      )}

      {editingId !== undefined && <ItemModal itemId={editingId} onClose={() => setEditingId(undefined)} />}
      {duplicatingItem && <ItemModal itemId={null} duplicateFrom={duplicatingItem} onClose={() => setDuplicatingItem(null)} />}
      {creatingSet && <SetModal onClose={() => setCreatingSet(false)} />}
      {deletingId && (
        <ConfirmModal
          title="Remover item"
          message="Tem certeza que deseja remover este item? Essa ação não pode ser desfeita."
          confirmLabel="Remover"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => { handleDelete(deletingId); setDeletingId(null); }}
        />
      )}
    </>
  );
}
