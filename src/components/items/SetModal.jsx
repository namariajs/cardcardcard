import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveJoinerInput } from '../../lib/joiners';
import { genId, genRosterId } from '../../lib/format';
import { BLANK_ITEM } from '../../lib/constants';
import Modal from '../shared/Modal';
import AutocompleteInput from '../shared/AutocompleteInput';

function newMemberRow() {
  return { rowId: Math.random().toString(36).slice(2, 9), name: '', joiner: '' };
}

export default function SetModal({ onClose }) {
  const { items, registry, memberRosters, itemCategories, upsertItem, upsertMemberRoster, removeMemberRoster } = useApp();

  const [setName, setSetName] = useState('');
  const [ceg, setCeg] = useState('');
  const [grupo, setGrupo] = useState('');
  const [category, setCategory] = useState('-');
  const [loja, setLoja] = useState('');
  const [tipo, setTipo] = useState('CEG_INTER');
  const [pricePerItem, setPricePerItem] = useState('');

  const [rosterId, setRosterId] = useState('');
  const [members, setMembers] = useState([newMemberRow()]);
  const [saveAsRoster, setSaveAsRoster] = useState(false);
  const [rosterName, setRosterName] = useState('');

  const joinerOptions = useMemo(() => registry.map((r) => ({ value: r.social, label: `${r.apelido}${r.phone ? ' — ' + r.phone : ''}` })), [registry]);
  const grupoOptions = useMemo(() => [...new Set(items.map((i) => i.grupo).filter((g) => g && g !== '-'))].sort(), [items]);
  const cegOptions = useMemo(() => [...new Set(items.map((i) => i.ceg).filter((c) => c && c.trim()))].sort(), [items]);

  function handleRosterChange(id) {
    setRosterId(id);
    if (!id) return; // "Nenhum" — keep whatever rows are already there
    const roster = memberRosters.find((r) => r.id === id);
    if (!roster) return;
    setMembers((roster.members || []).map((name) => ({ ...newMemberRow(), name })));
  }

  function handleDeleteRoster() {
    if (!rosterId) return;
    removeMemberRoster(rosterId);
    setRosterId('');
  }

  function updateMember(rowId, field, value) {
    setMembers((prev) => prev.map((m) => (m.rowId === rowId ? { ...m, [field]: value } : m)));
  }
  function addMember() {
    setMembers((prev) => [...prev, newMemberRow()]);
  }
  function removeMember(rowId) {
    setMembers((prev) => prev.filter((m) => m.rowId !== rowId));
  }

  function handleCreate() {
    const name = setName.trim();
    const validMembers = members.filter((m) => m.name.trim());
    if (!name) { alert('Informe o nome do set.'); return; }
    if (validMembers.length === 0) { alert('Adicione pelo menos um membro.'); return; }

    const price = parseFloat(String(pricePerItem).replace(',', '.')) || 0;
    const cegTrim = ceg.trim();
    const grupoTrim = grupo.trim() || '-';
    const lojaTrim = loja.trim();

    validMembers.forEach((m) => {
      const resolved = resolveJoinerInput(registry, m.joiner);
      const hasJoiner = !!resolved.value;
      upsertItem({
        ...BLANK_ITEM,
        id: genId(),
        itemName: name,
        ceg: cegTrim,
        grupo: grupoTrim,
        membro: m.name.trim(),
        category,
        loja: lojaTrim,
        tipo,
        valorItem: price,
        joiner: hasJoiner ? resolved.value : '',
        unclaimed: !hasJoiner,
        photoPending: true,
      });
    });

    if (saveAsRoster && !rosterId && rosterName.trim()) {
      upsertMemberRoster({
        id: genRosterId(),
        name: rosterName.trim(),
        members: validMembers.map((m) => m.name.trim()),
      });
    }

    onClose();
  }

  const validCount = members.filter((m) => m.name.trim()).length;

  return (
    <Modal onClose={onClose} maxWidth={680}>
      <h3>🗂️ Novo Set</h3>
      <p className="hint">Cria um item por membro, todos compartilhando nome, CEG, grupo, categoria, loja, tipo e preço.</p>
      <div className="form-grid">
        <div className="field full">
          <label>Nome do set</label>
          <input placeholder="Ex: STAY in our Little House - Dia 3" value={setName} onChange={(e) => setSetName(e.target.value)} />
        </div>
        <div className="field">
          <label>CEG</label>
          <AutocompleteInput placeholder="CEG..." value={ceg} onChange={setCeg} options={cegOptions} />
        </div>
        <div className="field">
          <label>Grupo</label>
          <AutocompleteInput placeholder="Ex: ZB1" value={grupo} onChange={setGrupo} options={grupoOptions} />
        </div>
        <div className="field">
          <label>Categoria</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="-">—</option>
            {itemCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Loja / POB</label>
          <input placeholder="Loja" value={loja} onChange={(e) => setLoja(e.target.value)} />
        </div>
        <div className="field">
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="CEG_INTER">CEG Inter</option>
            <option value="CEG_NACIONAL">CEG Nacional</option>
            <option value="VENDA">Venda</option>
          </select>
        </div>
        <div className="field">
          <label>Preço por item (R$)</label>
          <input value={pricePerItem} onChange={(e) => setPricePerItem(e.target.value)} />
        </div>
      </div>

      <h3 style={{ marginTop: 18 }}>Membros</h3>
      <div className="field full">
        <label>Usar roster salvo</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={{ flex: 1 }} value={rosterId} onChange={(e) => handleRosterChange(e.target.value)}>
            <option value="">Nenhum</option>
            {memberRosters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {rosterId && <button type="button" className="btn btn-ghost" onClick={handleDeleteRoster}>🗑</button>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
        {members.map((m) => (
          <div className="pay-row" style={{ padding: '8px 0' }} key={m.rowId}>
            <input type="text" placeholder="Nome do membro" style={{ flex: 1, minWidth: 120 }}
              value={m.name} onChange={(e) => updateMember(m.rowId, 'name', e.target.value)} />
            <div className="field" style={{ flex: 1, minWidth: 160, margin: 0 }}>
              <AutocompleteInput placeholder="@usuario (opcional)"
                value={m.joiner} onChange={(v) => updateMember(m.rowId, 'joiner', v)} options={joinerOptions} />
            </div>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => removeMember(m.rowId)}>🗑</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost" style={{ marginTop: 6 }} onClick={addMember}>+ Adicionar membro</button>

      {!rosterId && (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={saveAsRoster} onChange={(e) => setSaveAsRoster(e.target.checked)} />
            <span style={{ textTransform: 'none', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>💾 Salvar esta lista de membros como roster</span>
          </label>
          {saveAsRoster && (
            <div className="field" style={{ marginTop: 10 }}>
              <label>Nome do roster</label>
              <input placeholder="Ex: Stray Kids" value={rosterName} onChange={(e) => setRosterName(e.target.value)} />
            </div>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleCreate}>Criar set ({validCount} {validCount === 1 ? 'item' : 'itens'})</button>
      </div>
    </Modal>
  );
}
