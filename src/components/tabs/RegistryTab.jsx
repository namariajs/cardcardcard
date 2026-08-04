import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import RegistryModal from '../registry/RegistryModal';
import BulkImportRegistryModal from '../registry/BulkImportRegistryModal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';

export default function RegistryTab() {
  const { unlocked, registry, removeRegistryEntry } = useApp();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(undefined);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registry
      .filter((r) => !q || [r.apelido, r.nomeCompleto, r.social, r.phone].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.apelido.localeCompare(b.apelido));
  }, [registry, search]);

  if (!unlocked) {
    return <EmptyState title="Modo GOM necessário">Você não tem acesso a essa página.</EmptyState>;
  }

  return (
    <>
      <div className="registry-toolbar">
        <input type="search" placeholder="Buscar por apelido, nome, @ ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={() => setBulkImportOpen(true)}>📋 Importar em lote</button>
        <button className="btn btn-primary" onClick={() => setEditingId(null)}>+ Cadastrar joiner</button>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Nenhum joiner cadastrado">Clique em "Cadastrar joiner" para adicionar o primeiro.</EmptyState>
      ) : (
        <div className="registry-grid">
          {list.map((r) => (
            <div className="reg-card" key={r.id}>
              <div className="reg-name">{r.apelido}</div>
              <span className="reg-social">{r.social}</span>
              <div className="reg-row"><b>Nome completo:</b> {r.nomeCompleto || '—'}</div>
              <div className="reg-row"><b>Telefone:</b> {r.phone || '—'}</div>
              <div className="reg-actions">
                <button className="btn btn-ghost" onClick={() => setEditingId(r.id)}>✎ Editar</button>
                <button className="btn btn-danger" onClick={() => setDeletingId(r.id)}>🗑 Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId !== undefined && <RegistryModal entryId={editingId} onClose={() => setEditingId(undefined)} />}
      {bulkImportOpen && <BulkImportRegistryModal onClose={() => setBulkImportOpen(false)} />}
      {deletingId && (
        <ConfirmModal
          title="Remover joiner"
          message="Tem certeza que deseja remover este joiner do cadastro?"
          confirmLabel="Remover"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => { removeRegistryEntry(deletingId); setDeletingId(null); }}
        />
      )}
    </>
  );
}
