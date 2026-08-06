import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { genMemberId } from '../../lib/format';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';

export default function MembersModal({ onClose }) {
  const { members, upsertMember, removeMember } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    upsertMember({ id: genMemberId(), name });
    setNewName('');
  }

  function startEdit(member) {
    setEditingId(member.id);
    setEditingName(member.name);
  }

  function saveEdit() {
    const name = editingName.trim();
    if (!name) return;
    const member = members.find((m) => m.id === editingId);
    if (member) upsertMember({ ...member, name });
    setEditingId(null);
    setEditingName('');
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <h3>🧑‍🤝‍🧑 Membros</h3>
      <p className="hint">Lista compartilhada de membros usada como opção nos itens dos formulários. Remover um membro não afeta opções já escolhidas em respostas existentes.</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input type="text" placeholder="Nome do membro" style={{ flex: 1 }}
          value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
        <button type="button" className="btn btn-primary" onClick={handleAdd}>+ Adicionar</button>
      </div>

      {members.length === 0 ? (
        <EmptyState title="Nenhum membro cadastrado">Adicione o primeiro acima.</EmptyState>
      ) : (
        <div>
          {members.map((member) => (
            <div className="claim-row" key={member.id}>
              {editingId === member.id ? (
                <input type="text" style={{ flex: 1 }} autoFocus
                  value={editingName} onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
              ) : (
                <b>{member.name}</b>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {editingId === member.id ? (
                  <>
                    <button type="button" className="btn btn-sage" style={{ padding: '6px 10px' }} onClick={saveEdit}>✓</button>
                    <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => setEditingId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => startEdit(member)}>✎</button>
                    <button type="button" className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => setDeletingId(member.id)}>🗑</button>
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
          title="Remover membro"
          message="Tem certeza que deseja remover este membro da lista compartilhada?"
          confirmLabel="Remover"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => { removeMember(deletingId); setDeletingId(null); }}
        />
      )}
    </Modal>
  );
}
