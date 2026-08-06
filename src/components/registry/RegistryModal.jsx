import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { genRegId, formatPhoneBR, normHandle, onlyDigits } from '../../lib/format';
import { findRegistryConflict } from '../../lib/joiners';
import Modal from '../shared/Modal';

const BLANK = { apelido: '', nomeCompleto: '', phone: '', social: '' };

export default function RegistryModal({ entryId, onClose }) {
  const { registry, upsertRegistryEntry } = useApp();
  const existing = entryId ? registry.find((r) => r.id === entryId) : null;
  const [form, setForm] = useState(() => (existing ? { ...existing } : { ...BLANK, id: genRegId() }));
  const [saving, setSaving] = useState(false);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handlePhoneChange(e) {
    set('phone', formatPhoneBR(e.target.value));
  }

  async function handleSave() {
    const apelido = form.apelido.trim();
    const social = normHandle(form.social.trim());
    const nomeCompleto = form.nomeCompleto.trim();
    const phone = form.phone.trim();
    if (!apelido) { alert('Informe o apelido do joiner.'); return; }
    if (!social) { alert('Informe o @ do joiner.'); return; }

    const conflict = findRegistryConflict(registry, { social, phone, nomeCompleto }, form.id);

    if (conflict) {
      const phoneDigits = onlyDigits(phone);
      const socialLower = social.toLowerCase();
      let field;
      if (phoneDigits && onlyDigits(conflict.phone) === phoneDigits) field = 'esse telefone';
      else if (socialLower && String(conflict.social || '').toLowerCase() === socialLower) field = 'esse @';
      else field = 'esse nome completo';
      alert(`Já existe um joiner cadastrado com ${field} (${conflict.apelido}).`);
      return;
    }

    setSaving(true);
    const { error } = await upsertRegistryEntry({ id: form.id, apelido, nomeCompleto, phone, social });
    setSaving(false);
    if (error) { alert('Não foi possível salvar o cadastro — a gravação falhou. Verifique sua conexão e tente novamente.'); return; }
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
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : entryId ? 'Salvar alterações' : 'Cadastrar'}</button>
      </div>
    </Modal>
  );
}
