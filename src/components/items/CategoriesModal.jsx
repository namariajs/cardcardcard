import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { genCategoryId } from '../../lib/format';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';

export default function CategoriesModal({ onClose }) {
  const { itemCategories, upsertItemCategory, removeItemCategory } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  function handleAdd() {
    const label = newName.trim();
    if (!label) return;
    upsertItemCategory({ id: genCategoryId(), label });
    setNewName('');
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditingName(cat.label);
  }

  function saveEdit() {
    const label = editingName.trim();
    if (!label) return;
    const cat = itemCategories.find((c) => c.id === editingId);
    if (cat) upsertItemCategory({ ...cat, label });
    setEditingId(null);
    setEditingName('');
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <h3>🏷️ Categorias de item</h3>
      <p className="hint">Gerencie as categorias disponíveis no cadastro de itens. Remover uma categoria não afeta itens que já a usam.</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input type="text" placeholder="Nova categoria" style={{ flex: 1 }}
          value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
        <button type="button" className="btn btn-primary" onClick={handleAdd}>+ Adicionar</button>
      </div>

      {itemCategories.length === 0 ? (
        <EmptyState title="Nenhuma categoria cadastrada">Adicione a primeira acima.</EmptyState>
      ) : (
        <div>
          {itemCategories.map((cat) => (
            <div className="claim-row" key={cat.id}>
              {editingId === cat.id ? (
                <input type="text" style={{ flex: 1 }} autoFocus
                  value={editingName} onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
              ) : (
                <b>{cat.label}</b>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {editingId === cat.id ? (
                  <>
                    <button type="button" className="btn btn-sage" style={{ padding: '6px 10px' }} onClick={saveEdit}>✓</button>
                    <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => setEditingId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => startEdit(cat)}>✎</button>
                    <button type="button" className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => setDeletingId(cat.id)}>🗑</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
      </div>

      {deletingId && (
        <ConfirmModal
          title="Remover categoria"
          message="Tem certeza que deseja remover esta categoria? Itens que já usam essa categoria não serão alterados."
          confirmLabel="Remover"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => { removeItemCategory(deletingId); setDeletingId(null); }}
        />
      )}
    </Modal>
  );
}
