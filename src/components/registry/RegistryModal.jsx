import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { genRegId, formatPhoneBR, normHandle } from '../../lib/format';
import Modal from '../shared/Modal';

const BLANK = { apelido: '', nomeCompleto: '', phone: '', social: '' };

export default function RegistryModal({ entryId, onClose }) {
  const { registry, upsertRegistryEntry } = useApp();
  const existing = entryId ? registry.find((r) => r.id === entryId) : null;
  const [form, setForm] = useState(() => (existing ? { ...existing } : { ...BLANK, id: genRegId() }));

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handlePhoneChange(e) {
    set('phone', formatPhoneBR(e.target.value));
  }

  function handleSave() {
    const apelido = form.apelido.trim();
    const social = normHandle(form.social.trim());
    if (!apelido) { alert('Informe o apelido do joiner.'); return; }
    if (!social) { alert('Informe o @ do joiner.'); return; }
    upsertRegistryEntry({ id: form.id, apelido, nomeCompleto: form.nomeCompleto.trim(), phone: form.phone.trim(), social });
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h3>{entryId ? 'Editar joiner' : 'Cadastrar joiner'}</h3>
      <p className="hint">ID: <span className="mono">{form.id}</span></p>
      <div className="form-grid">
        <div className="field full"><label>Apelido</label><input placeholder="Como você chama a pessoa" value={form.apelido} onChange={(e) => set('apelido', e.target.value)} /></div>
        <div className="field full"><label>Nome Completo</label><input placeholder="Nome completo" value={form.nomeCompleto} onChange={(e) => set('nomeCompleto', e.target.value)} /></div>
        <div className="field full"><label>Telefone</label><input inputMode="numeric" placeholder="(11) 91234-5678" value={form.phone} onChange={handlePhoneChange} /></div>
        <div className="field full"><label>Social (@)</label><input placeholder="@usuario" value={form.social} onChange={(e) => set('social', e.target.value)} /></div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>{entryId ? 'Salvar alterações' : 'Cadastrar'}</button>
      </div>
    </Modal>
  );
}
