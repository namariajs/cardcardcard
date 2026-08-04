import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveJoinerInput, findRegistryBySocial } from '../../lib/joiners';
import { computePanelStats, itemMatchesPanelStatusFilter, PANEL_STATUS_FILTER_LABELS } from '../../lib/calc';
import { fmt, itemDisplayTitle, statusLabel, isInterItem } from '../../lib/format';
import { deletePhoto } from '../../lib/storage';
import ItemCard from '../items/ItemCard';
import ItemModal from '../items/ItemModal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';
import PaymentFieldCell from '../shared/PaymentFieldCell';

export default function MyPanelTab() {
  const { items, registry, shippingRequests, unlocked, removeItem } = useApp();
  const [handle, setHandle] = useState('');
  const [inputDraft, setInputDraft] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [cegFilter, setCegFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingId, setEditingId] = useState(undefined);
  const [deletingId, setDeletingId] = useState(null);
  const [duplicatingItem, setDuplicatingItem] = useState(null);

  function doLookup() {
    const raw = inputDraft.trim();
    if (!raw) return;
    const resolved = resolveJoinerInput(registry, raw);
    if (!resolved.value) return;
    setHandle(resolved.value);
    setSearchQuery(''); setCegFilter(''); setStatusFilter('');
  }
  function clearLookup() {
    setHandle(''); setInputDraft(''); setSearchQuery(''); setCegFilter(''); setStatusFilter('');
  }

  const all = useMemo(() => (handle ? items.filter((it) => it.joiner.toLowerCase() === handle.toLowerCase()) : []), [items, handle]);
  const regMatch = handle ? findRegistryBySocial(registry, handle) : null;
  const stats = useMemo(() => computePanelStats(all, handle, shippingRequests), [all, handle, shippingRequests]);
  const cegs = useMemo(() => [...new Set(all.map((i) => i.ceg))].sort(), [all]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return all.filter((it) => {
      const matchQ = !q || [it.itemName, it.ceg, it.id, it.loja].join(' ').toLowerCase().includes(q);
      const matchCeg = !cegFilter || it.ceg === cegFilter;
      const matchStatus = itemMatchesPanelStatusFilter(it, statusFilter, handle, shippingRequests);
      return matchQ && matchCeg && matchStatus;
    });
  }, [all, searchQuery, cegFilter, statusFilter, handle, shippingRequests]);

  async function handleDelete(id) {
    const it = items.find((i) => i.id === id);
    removeItem(id);
    if (it?.hasPhoto) await deletePhoto(id);
  }

  return (
    <>
      <div className="panel-intro">
        <h3>👤 Painel do Joiner</h3>
        <p>Digite seu @ ou telefone para ver todos os seus itens, status e pagamentos em um só lugar.</p>
        <div className="panel-lookup-row">
          <input type="text" placeholder="@seuusuario ou telefone (ex: 11912345678)" value={inputDraft}
            onChange={(e) => setInputDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }} />
          <button className="btn btn-primary" onClick={doLookup}>🔎 Ver meus itens</button>
          {handle && <button className="btn btn-ghost" onClick={clearLookup}>✕ Limpar</button>}
        </div>
      </div>

      {!handle ? null : all.length === 0 ? (
        <EmptyState title={`Nenhum item encontrado para ${handle}`}>Confira se digitou o @ ou telefone certinho.</EmptyState>
      ) : (
        <>
          <div className="panel-summary">
            <div className="panel-summary-head">
              <h4>Resumo de {regMatch ? regMatch.apelido : handle}</h4>
              <span className="badge neutral">{stats.total} {stats.total === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="panel-summary-grid">
              <div className="psum-box"><div className="psum-label">Total de itens</div><div className="psum-value">{stats.total}</div></div>
              <div className="psum-box"><div className="psum-label">Pago</div><div className="psum-value ok">{fmt(stats.paidValue)}</div></div>
              <PsumClickable active={statusFilter === 'atrasado'} onClick={() => setStatusFilter(statusFilter === 'atrasado' ? '' : 'atrasado')}
                label="Atrasado" valueClass="danger" value={`${stats.lateCount} — ${fmt(stats.lateValue)}`} />
              <PsumClickable active={statusFilter === 'freteInter'} onClick={() => setStatusFilter(statusFilter === 'freteInter' ? '' : 'freteInter')}
                label="Inter Pendente" valueClass="pending" value={fmt(stats.freteInterPending)} />
              <PsumClickable active={statusFilter === 'taxa'} onClick={() => setStatusFilter(statusFilter === 'taxa' ? '' : 'taxa')}
                label="Taxa Pendente" valueClass="pending" value={fmt(stats.taxaPending)} />
              <PsumClickable active={statusFilter === 'freteNac'} onClick={() => setStatusFilter(statusFilter === 'freteNac' ? '' : 'freteNac')}
                label="Nacional Pendente" valueClass="pending" value={fmt(stats.freteNacPending)} />
              <div className="psum-box"><div className="psum-label">Envio Liberado</div><div className="psum-value">{stats.releasedForShipping}</div></div>
              <div className="psum-box"><div className="psum-label">Enviados</div><div className="psum-value">{stats.shipped}</div></div>
              <div className="psum-box"><div className="psum-label">Entregues</div><div className="psum-value ok">{stats.delivered}</div></div>
            </div>
          </div>

          {statusFilter && (
            <div className="lock-note" style={{ marginBottom: 12 }}>
              <span>🔍 Filtrando por: <b>{PANEL_STATUS_FILTER_LABELS[statusFilter] || statusFilter}</b></span>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 11.5 }} onClick={() => setStatusFilter('')}>✕ Limpar filtro</button>
            </div>
          )}

          <div className="panel-toolbar">
            <button className="btn btn-ghost" onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}>
              {viewMode === 'cards' ? '📋 Ver em lista' : '🗂 Ver em cards'}
            </button>
            <input type="search" placeholder="Buscar dentro dos seus itens (nome, ID, CEG, loja)" style={{ minWidth: 220 }}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <select value={cegFilter} onChange={(e) => setCegFilter(e.target.value)}>
              <option value="">Todas as CEGs</option>
              {cegs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Nenhum item corresponde à busca">Ajuste os filtros acima.</EmptyState>
          ) : viewMode === 'cards' ? (
            <div className="grid">
              {filtered.map((it) => <ItemCard key={it.id} item={it} showJoinerBadge={false} onEdit={setEditingId} onDelete={setDeletingId} onDuplicate={setDuplicatingItem} />)}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Item</th><th>CEG</th><th>Item</th><th>Frete Inter</th><th>Taxa</th><th>Status</th>{unlocked && <th></th>}</tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <tr key={it.id}>
                      <td><b>{itemDisplayTitle(it)}</b>{unlocked && <><br /><span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{it.id}</span></>}</td>
                      <td>{it.ceg}</td>
                      <td><PaymentFieldCell item={it} fieldKey="item" /></td>
                      <td><PaymentFieldCell item={it} fieldKey="freteInter" visible={isInterItem(it)} /></td>
                      <td><PaymentFieldCell item={it} fieldKey="taxa" visible={isInterItem(it)} /></td>
                      <td>{statusLabel('statusCeg', it.statusCeg)} / {statusLabel('statusEnvio', it.statusEnvio)}</td>
                      {unlocked && (
                        <td>
                          <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => setEditingId(it.id)}>✎</button>{' '}
                          <button className="btn btn-ghost" style={{ padding: '5px 8px' }} onClick={() => setDuplicatingItem(it)}>⧉</button>{' '}
                          <button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => setDeletingId(it.id)}>🗑</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editingId !== undefined && <ItemModal itemId={editingId} onClose={() => setEditingId(undefined)} />}
      {duplicatingItem && <ItemModal itemId={null} duplicateFrom={duplicatingItem} onClose={() => setDuplicatingItem(null)} />}
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

function PsumClickable({ active, onClick, label, valueClass, value }) {
  return (
    <div className={`psum-box psum-clickable${active ? ' psum-active' : ''}`} onClick={onClick}>
      <div className="psum-label">{label}</div>
      <div className={`psum-value ${valueClass}`}>{value}</div>
    </div>
  );
}
