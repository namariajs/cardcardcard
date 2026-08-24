import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import ItemCard from '../items/ItemCard';
import ItemRow from '../items/ItemRow';
import ItemModal from '../items/ItemModal';
import SetModal from '../items/SetModal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';
import StyledSelect from '../shared/StyledSelect';
import PhotoThumb from '../shared/PhotoThumb';
import { deletePhoto } from '../../lib/storage';
import { paymentFieldEffective, pendingItemOrders } from '../../lib/calc';
import { findRegistryBySocial } from '../../lib/joiners';
import { itemDisplayTitle, formatClaimDate, formatDateOnly } from '../../lib/format';
import { PAYMENT_FIELDS, STATUS_CEG } from '../../lib/constants';

// Sentinel joinerFilter value meaning "unclaimed items only" — distinct from any real
// handle since normHandle always prefixes those with '@'.
const UNCLAIMED_FILTER = '__unclaimed__';

export default function ItemsTab({ unclaimedOnly = false, externalQuery, onExternalQueryConsumed, externalJoinerFilter, onExternalJoinerFilterConsumed }) {
  const { items, unlocked, removeItem, upsertItem, registry, itemOrders, approveItemOrder, denyItemOrder } = useApp();
  const [query, setQuery] = useState('');
  const [joinerFilter, setJoinerFilter] = useState(unclaimedOnly ? UNCLAIMED_FILTER : '');
  const [caixaFilter, setCaixaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('');
  const [cegFilter, setCegFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [editingId, setEditingId] = useState(undefined); // undefined = closed, null = new item, string = edit
  const [deletingId, setDeletingId] = useState(null);
  const [duplicatingItem, setDuplicatingItem] = useState(null);
  const [creatingSet, setCreatingSet] = useState(false);
  const [photoPendingFilter, setPhotoPendingFilter] = useState(false);
  const [openForms, setOpenForms] = useState([]);
  const [openFormsLoaded, setOpenFormsLoaded] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatusCeg, setBulkStatusCeg] = useState('');

  useEffect(() => {
    if (externalQuery) { setQuery(externalQuery); onExternalQueryConsumed?.(); }
  }, [externalQuery, onExternalQueryConsumed]);

  useEffect(() => {
    if (externalJoinerFilter) { setJoinerFilter(externalJoinerFilter); onExternalJoinerFilterConsumed?.(); }
  }, [externalJoinerFilter, onExternalJoinerFilterConsumed]);

  useEffect(() => {
    if (!unclaimedOnly) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('forms').select('id, title, subtitle, slug, deadline').eq('status', 'open').order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) { console.error('ItemsTab: failed to load open forms', error); setOpenFormsLoaded(true); return; }
      // A form past its own deadline is treated as closed by the public page itself
      // (see PublicFormPage) — linking to it here would just land on "Encerrado".
      const now = new Date();
      setOpenForms((data || []).filter((f) => !f.deadline || new Date(f.deadline) >= now));
      setOpenFormsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [unclaimedOnly]);

  const joiners = useMemo(() => [...new Set(items.map((i) => i.joiner))].filter(Boolean).sort(), [items]);
  const caixas = useMemo(() => [...new Set(items.map((i) => i.caixa).filter((c) => c && c !== '-'))].sort(), [items]);
  const grupos = useMemo(() => [...new Set(items.map((i) => i.grupo).filter((g) => g && g !== '-'))].sort(), [items]);
  const cegs = useMemo(() => [...new Set(items.map((i) => i.ceg).filter((c) => c && c.trim()))].sort(), [items]);

  const joinerOptions = useMemo(() => [
    { value: '', label: 'Todos os joiners' },
    { value: UNCLAIMED_FILTER, label: '🟢 Apenas disponíveis' },
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
  const grupoOptions = useMemo(() => [
    { value: '', label: 'Todos os grupos' },
    ...grupos.map((g) => ({ value: g, label: g })),
  ], [grupos]);
  const cegOptions = useMemo(() => [
    { value: '', label: 'Todas as CEGs' },
    ...cegs.map((c) => ({ value: c, label: c })),
  ], [cegs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchQ = !q || [it.joiner, it.itemName, it.ceg, it.id, it.loja, it.caixa, it.grupo, it.membro].join(' ').toLowerCase().includes(q);
      const matchJ = !joinerFilter || (joinerFilter === UNCLAIMED_FILTER ? it.unclaimed : it.joiner === joinerFilter);
      const matchC = !caixaFilter || it.caixa === caixaFilter;
      const matchS = !statusFilter || PAYMENT_FIELDS.some((f) => paymentFieldEffective(it, f).status === statusFilter);
      const matchG = !grupoFilter || it.grupo === grupoFilter;
      const matchCeg = !cegFilter || it.ceg === cegFilter;
      const matchPhotoPending = !photoPendingFilter || it.photoPending;
      return matchQ && matchJ && matchC && matchS && matchG && matchCeg && matchPhotoPending;
    });
  }, [items, query, joinerFilter, caixaFilter, statusFilter, grupoFilter, cegFilter, photoPendingFilter]);

  const pendingOrders = useMemo(
    () => pendingItemOrders(itemOrders).sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt)),
    [itemOrders],
  );
  const photoPendingCount = useMemo(() => items.filter((it) => it.photoPending).length, [items]);

  const statusCegOptions = useMemo(() => Object.entries(STATUS_CEG).map(([k, label]) => ({ value: k, label })), []);
  const allFilteredSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id));

  async function handleDelete(id) {
    const it = items.find((i) => i.id === id);
    removeItem(id);
    if (it?.hasPhoto) await deletePhoto(id);
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (filtered.every((it) => prev.has(it.id))) return new Set();
      return new Set(filtered.map((it) => it.id));
    });
  }

  function handleBulkStatusChange() {
    if (!bulkStatusCeg || selected.size === 0) return;
    selected.forEach((id) => {
      const it = items.find((i) => i.id === id);
      if (it) upsertItem({ ...it, statusCeg: bulkStatusCeg });
    });
    setSelected(new Set());
    setBulkStatusCeg('');
  }

  return (
    <>
      <div className="toolbar">
        {!unclaimedOnly && (
          <>
            <input type="search" placeholder="Buscar por joiner, item, CEG, ID..." style={{ minWidth: 220 }}
              value={query} onChange={(e) => setQuery(e.target.value)} />
            <StyledSelect value={joinerFilter} onChange={setJoinerFilter} options={joinerOptions} placeholder="Todos os joiners" />
            <StyledSelect value={caixaFilter} onChange={setCaixaFilter} options={caixaOptions} placeholder="Todas as caixas" />
            <StyledSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder="Todos os pagamentos" />
          </>
        )}
        <StyledSelect value={grupoFilter} onChange={setGrupoFilter} options={grupoOptions} placeholder="Todos os grupos" />
        <StyledSelect value={cegFilter} onChange={setCegFilter} options={cegOptions} placeholder="Todas as CEGs" />
        <div className="spacer" />
        {unlocked && !unclaimedOnly && (photoPendingCount > 0 || photoPendingFilter) && (
          <button
            type="button"
            className={`btn ${photoPendingFilter ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPhotoPendingFilter((v) => !v)}
            title="Filtrar itens que ainda precisam de foto"
          >
            📷 {photoPendingCount} {photoPendingCount === 1 ? 'foto pendente' : 'fotos pendentes'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}>
          {viewMode === 'cards' ? '📋 Ver em lista' : '🗂 Ver em cards'}
        </button>
        {unlocked && !unclaimedOnly && (
          <>
            <button className="btn btn-ghost" onClick={() => setCreatingSet(true)}>🗂️ Novo Set</button>
            <button className="btn btn-primary" onClick={() => setEditingId(null)}>+ Adicionar item</button>
          </>
        )}
      </div>

      {unlocked && unclaimedOnly && (
        <div className="gom-claims-box">
          <h3>📩 Pedidos de itens disponíveis</h3>
          <p>{pendingOrders.length === 0 ? 'Nenhum pedido pendente no momento.' : 'Aprove para atribuir o item ao joiner, ou negue para mantê-lo disponível para outra pessoa.'}</p>
          {pendingOrders.map((order) => {
            const orderItem = items.find((i) => i.id === order.itemId);
            const matchedEntry = order.resolvedJoiner ? findRegistryBySocial(registry, order.resolvedJoiner) : null;
            return (
              <div className="claim-row" key={order.id}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {orderItem && <PhotoThumb item={orderItem} size={50} />}
                  <div className="claim-info">
                    <b>{orderItem ? itemDisplayTitle(orderItem) : '(item removido)'}</b><br />
                    {order.pendingCadastro ? (
                      <>
                        {order.pendingCadastro.apelido}{order.pendingCadastro.nomeCompleto ? ' — ' + order.pendingCadastro.nomeCompleto : ''} ({order.pendingCadastro.social})
                        {' '}<span style={{ color: 'var(--pink-deep)' }}>· novo cadastro</span>
                      </>
                    ) : (
                      <>{matchedEntry ? matchedEntry.apelido : order.resolvedJoiner}{matchedEntry?.nomeCompleto ? ' — ' + matchedEntry.nomeCompleto : ''} ({order.resolvedJoiner})</>
                    )}
                    <br />Pedido em {formatClaimDate(order.requestedAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sage" onClick={() => approveItemOrder(order.id)}>✔ Aprovar</button>
                  <button className="btn btn-danger" onClick={() => denyItemOrder(order.id)}>✕ Negar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {unclaimedOnly && (
        <div style={{ marginBottom: 24 }}>
          <h3 className="menu-section-title" style={{ marginTop: 0 }}>🎫 CEGs Abertas</h3>
          {!openFormsLoaded ? null : openForms.length === 0 ? (
            <EmptyState className="empty-compact" title="Nenhuma CEG aberta no momento">Volte mais tarde para ver novas campanhas de claim/compra.</EmptyState>
          ) : (
            <div className="grid">
              {openForms.map((f) => (
                <a key={f.id} href={`/f/${f.slug}`} target="_blank" rel="noopener noreferrer" className="reg-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  <div className="item-top">
                    <div className="reg-name">{f.title}</div>
                    <span className="badge pago">🟢 Aberto</span>
                  </div>
                  {f.subtitle && <div className="reg-row">{f.subtitle}</div>}
                  {f.deadline && <div className="reg-row"><b>Prazo:</b> {formatDateOnly(f.deadline)}</div>}
                  <div className="card-actions">
                    <span className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Abrir formulário →</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={unclaimedOnly ? 'Nenhum item disponível' : 'Nenhum item encontrado'}>
          {unclaimedOnly ? 'Ajuste os filtros ou volte mais tarde para ver novos itens disponíveis.' : 'Ajuste a busca ou os filtros, ou adicione um novo item.'}
        </EmptyState>
      ) : viewMode === 'cards' ? (
        <div className="grid">
          {filtered.map((it) => (
            <ItemCard key={it.id} item={it} showJoinerBadge unclaimedView={unclaimedOnly} onEdit={setEditingId} onDelete={setDeletingId} onDuplicate={setDuplicatingItem} />
          ))}
        </div>
      ) : (
        <>
          {unlocked && selected.size > 0 && (
            <div className="panel-toolbar">
              <span>{selected.size} {selected.size === 1 ? 'item selecionado' : 'itens selecionados'}</span>
              <StyledSelect value={bulkStatusCeg} onChange={setBulkStatusCeg} options={statusCegOptions} placeholder="Status CEG..." />
              <button className="btn btn-primary" disabled={!bulkStatusCeg} onClick={handleBulkStatusChange}>Aplicar</button>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {unlocked && <th><input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} /></th>}
                  <th>Item</th><th>Joiner</th><th>CEG</th><th>Item</th><th>Frete Inter</th><th>Taxa</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <ItemRow key={it.id} item={it} selected={selected.has(it.id)} onToggleSelect={toggleSelect} onEdit={setEditingId} onDelete={setDeletingId} onDuplicate={setDuplicatingItem} />
                ))}
              </tbody>
            </table>
          </div>
        </>
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
