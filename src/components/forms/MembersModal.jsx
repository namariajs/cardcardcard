import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { genMemberId } from '../../lib/format';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';
import AutocompleteInput from '../shared/AutocompleteInput';

const DEFAULT_GROUP = 'Geral';

export default function MembersModal({ onClose }) {
  const { members, upsertMember, removeMember } = useApp();
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingGroup, setEditingGroup] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const groupOptions = useMemo(
    () => [...new Set(members.map((m) => m.group_name).filter(Boolean))].sort(),
    [members]
  );

  const groupedMembers = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      const group = m.group_name || DEFAULT_GROUP;
      if (!map[group]) map[group] = [];
      map[group].push(m);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [members]);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    upsertMember({ id: genMemberId(), name, group_name: newGroup.trim() || DEFAULT_GROUP });
    setNewName('');
    setNewGroup('');
  }

  function startEdit(member) {
    setEditingId(member.id);
    setEditingName(member.name);
    setEditingGroup(member.group_name || DEFAULT_GROUP);
  }

  function saveEdit() {
    const name = editingName.trim();
    if (!name) return;
    const member = members.find((m) => m.id === editingId);
    if (member) upsertMember({ ...member, name, group_name: editingGroup.trim() || DEFAULT_GROUP });
    setEditingId(null);
    setEditingName('');
    setEditingGroup('');
  }

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <h3>🧑‍🤝‍🧑 Membros</h3>
      <p className="hint">Lista compartilhada de membros usada como opção nos itens dos formulários. Agrupe por grupo (ex: "SKZOO", "Stray Kids") para organizar a lista no seletor de opções. Remover um membro não afeta opções já escolhidas em respostas existentes.</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Nome do membro" style={{ flex: 1, minWidth: 140 }}
          value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
        <div style={{ flex: 1, minWidth: 140 }}>
          <AutocompleteInput placeholder="Grupo (ex: SKZOO)" value={newGroup} onChange={setNewGroup} options={groupOptions} />
        </div>
        <button type="button" className="btn btn-primary" onClick={handleAdd}>+ Adicionar</button>
      </div>

      {members.length === 0 ? (
        <EmptyState title="Nenhum membro cadastrado">Adicione o primeiro acima.</EmptyState>
      ) : (
        <div>
          {groupedMembers.map(([groupName, groupMembers]) => (
            <div key={groupName} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '10px 0 6px' }}>{groupName}</div>
              {groupMembers.map((member) => (
                <div className="claim-row" key={member.id}>
                  {editingId === member.id ? (
                    <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                      <input type="text" style={{ flex: 1, minWidth: 100 }} autoFocus
                        value={editingName} onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }} />
                      <div style={{ flex: 1, minWidth: 100 }}>
                        <AutocompleteInput placeholder="Grupo" value={editingGroup} onChange={setEditingGroup} options={groupOptions} />
                      </div>
                    </div>
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
