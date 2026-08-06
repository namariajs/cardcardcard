import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { genFormSlug } from '../../lib/format';
import { resizeImageFile, uploadFormUpload } from '../../lib/storage';
import Modal from '../shared/Modal';
import MembersModal from './MembersModal';

const BLANK_FORM = {
  title: '', subtitle: '', rulesText: '', deadline: '', pixKey: '',
  allowCardPayment: false, cardContactText: '', thankYouText: '', joinGroupLink: '',
};

const SELECTION_TYPE_LABELS = {
  random: 'Aleatório (só quantidade)',
  single_choice: 'Escolha única (marcar opções)',
  multi_choice_qty: 'Múltipla escolha com quantidade',
};

function newLocalItem() {
  return {
    _tempKey: Math.random().toString(36).slice(2, 9),
    id: null,
    name: '', price: '', photoUrl: null, photoFile: null,
    instructions: '', selectionType: 'random', optionMemberIds: [],
  };
}

export default function FormWizardModal({ formId, onClose, onSaved }) {
  const { members } = useApp();
  const isEditing = !!formId;
  const [step, setStep] = useState('info'); // 'info' | 'itens' | 'revisao'
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formRow, setFormRow] = useState(null); // the persisted forms row (set once step 1 saves)
  const [form, setForm] = useState({ ...BLANK_FORM, slug: genFormSlug() });
  const [localItems, setLocalItems] = useState([newLocalItem()]);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    (async () => {
      const { data: formData, error } = await supabase.from('forms').select('*').eq('id', formId).single();
      if (error || cancelled) { if (error) console.error(error); return; }
      setFormRow(formData);
      setForm({
        title: formData.title, subtitle: formData.subtitle || '', rulesText: formData.rules_text || '',
        deadline: formData.deadline ? formData.deadline.slice(0, 16) : '', pixKey: formData.pix_key || '',
        allowCardPayment: formData.allow_card_payment, cardContactText: formData.card_contact_text || '',
        thankYouText: formData.thank_you_text || '', joinGroupLink: formData.join_group_link || '',
        slug: formData.slug,
      });
      const { data: itemRows } = await supabase.from('form_items').select('*').eq('form_id', formId).order('order_index');
      const { data: optRows } = await supabase.from('form_item_options').select('*').in('form_item_id', (itemRows || []).map((i) => i.id));
      if (cancelled) return;
      const items = (itemRows || []).map((row) => ({
        _tempKey: row.id, id: row.id, name: row.name, price: String(row.price), photoUrl: row.photo_url, photoFile: null,
        instructions: row.instructions || '', selectionType: row.selection_type,
        optionMemberIds: (optRows || []).filter((o) => o.form_item_id === row.id).map((o) => o.member_id),
      }));
      setLocalItems(items.length ? items : [newLocalItem()]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isEditing, formId]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function updateItem(tempKey, patch) {
    setLocalItems((prev) => prev.map((it) => (it._tempKey === tempKey ? { ...it, ...(typeof patch === 'function' ? patch(it) : patch) } : it)));
  }
  function addItem() { setLocalItems((prev) => [...prev, newLocalItem()]); }
  function removeItem(tempKey) { setLocalItems((prev) => prev.filter((it) => it._tempKey !== tempKey)); }
  function moveItem(tempKey, dir) {
    setLocalItems((prev) => {
      const idx = prev.findIndex((it) => it._tempKey === tempKey);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  async function handlePhotoChange(tempKey, e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      updateItem(tempKey, { photoUrl: dataUrl, photoFile: file });
    } catch {
      alert('Não foi possível carregar essa imagem.');
    }
  }

  function toggleOption(tempKey, memberId) {
    updateItem(tempKey, (it) => {
      const has = it.optionMemberIds.includes(memberId);
      return { optionMemberIds: has ? it.optionMemberIds.filter((id) => id !== memberId) : [...it.optionMemberIds, memberId] };
    });
  }

  async function saveInfoStep() {
    if (!form.title.trim()) { alert('Informe o título do formulário.'); return false; }
    setSaving(true);
    const row = {
      slug: form.slug,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      rules_text: form.rulesText,
      deadline: form.deadline || null,
      pix_key: form.pixKey.trim(),
      allow_card_payment: form.allowCardPayment,
      card_contact_text: form.cardContactText.trim(),
      thank_you_text: form.thankYouText.trim(),
      join_group_link: form.joinGroupLink.trim(),
    };
    if (formRow?.id) row.id = formRow.id;
    const { data, error } = await supabase.from('forms').upsert(row).select().single();
    setSaving(false);
    if (error) { alert('Não foi possível salvar o formulário.'); console.error(error); return false; }
    setFormRow(data);
    return true;
  }

  async function saveItemsStep() {
    const validItems = localItems.filter((it) => it.name.trim());
    if (validItems.length === 0) { alert('Adicione pelo menos um item.'); return false; }
    setSaving(true);
    try {
      const { data: existingRows } = await supabase.from('form_items').select('id').eq('form_id', formRow.id);
      const keptIds = new Set(validItems.filter((it) => it.id).map((it) => it.id));
      const toDelete = (existingRows || []).map((r) => r.id).filter((id) => !keptIds.has(id));
      if (toDelete.length) await supabase.from('form_items').delete().in('id', toDelete);

      for (let idx = 0; idx < validItems.length; idx++) {
        const li = validItems[idx];
        let photoUrl = li.photoUrl;
        if (li.photoFile) {
          const uploaded = await uploadFormUpload(li.photoFile);
          if (uploaded) photoUrl = uploaded;
        }
        const row = {
          form_id: formRow.id, name: li.name.trim(), price: parseFloat(String(li.price).replace(',', '.')) || 0,
          photo_url: photoUrl || null, instructions: li.instructions.trim(), selection_type: li.selectionType, order_index: idx,
        };
        if (li.id) row.id = li.id;
        const { data: savedItem, error } = await supabase.from('form_items').upsert(row).select().single();
        if (error) { console.error(error); continue; }

        if (li.selectionType === 'random') {
          await supabase.from('form_item_options').delete().eq('form_item_id', savedItem.id);
        } else {
          const { data: existingOpts } = await supabase.from('form_item_options').select('id, member_id').eq('form_item_id', savedItem.id);
          const existingMemberIds = new Set((existingOpts || []).map((o) => o.member_id));
          const wanted = new Set(li.optionMemberIds);
          const toRemoveOptIds = (existingOpts || []).filter((o) => !wanted.has(o.member_id)).map((o) => o.id);
          if (toRemoveOptIds.length) await supabase.from('form_item_options').delete().in('id', toRemoveOptIds);
          const toAdd = [...wanted].filter((mid) => !existingMemberIds.has(mid));
          if (toAdd.length) await supabase.from('form_item_options').insert(toAdd.map((member_id) => ({ form_item_id: savedItem.id, member_id })));
        }
      }
      return true;
    } catch (e) {
      console.error(e);
      alert('Não foi possível salvar os itens.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleNextFromInfo() {
    if (await saveInfoStep()) setStep('itens');
  }
  async function handleNextFromItens() {
    if (await saveItemsStep()) setStep('revisao');
  }

  async function toggleStatus() {
    const newStatus = formRow.status === 'open' ? 'closed' : 'open';
    const { data, error } = await supabase.from('forms').update({ status: newStatus }).eq('id', formRow.id).select().single();
    if (error) { console.error(error); return; }
    setFormRow(data);
  }

  function handleFinish() {
    onSaved?.();
    onClose();
  }

  const publicUrl = formRow ? `${window.location.origin}/f/${formRow.slug}` : '';

  async function handleCopy() {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { alert(publicUrl); }
  }

  if (loading) {
    return <Modal onClose={onClose}><p className="hint">Carregando...</p></Modal>;
  }

  return (
    <Modal onClose={onClose} maxWidth={720}>
      <h3>{isEditing ? 'Editar formulário' : 'Novo formulário'}</h3>
      <p className="hint">
        Passo {step === 'info' ? '1' : step === 'itens' ? '2' : '3'} de 3 —{' '}
        {step === 'info' ? 'Informações' : step === 'itens' ? 'Itens' : 'Revisão e publicação'}
      </p>

      {step === 'info' && (
        <>
          <div className="form-grid">
            <div className="field full"><label>Título</label><input placeholder="Ex: CEG Álbum + Photocard" value={form.title} onChange={(e) => set('title', e.target.value)} /></div>
            <div className="field full"><label>Subtítulo</label><input placeholder="Descrição curta (opcional)" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></div>
            <div className="field full"><label>Regras</label><textarea rows={5} placeholder={'Ex:\n- Pagamento em até 48h\n- Sem reembolso após o prazo'} value={form.rulesText} onChange={(e) => set('rulesText', e.target.value)} /></div>
            <div className="field"><label>Prazo final</label><input type="datetime-local" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} /></div>
            <div className="field"><label>Chave Pix</label><input placeholder="Chave Pix" value={form.pixKey} onChange={(e) => set('pixKey', e.target.value)} /></div>
            <div className="field full">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>
                <input type="checkbox" checked={form.allowCardPayment} onChange={(e) => set('allowCardPayment', e.target.checked)} />
                Aceitar pagamento por cartão de crédito
              </label>
            </div>
            {form.allowCardPayment && (
              <div className="field full"><label>Mensagem para pagamento por cartão</label><input placeholder="Ex: Envie mensagem para @gom para pagar por cartão" value={form.cardContactText} onChange={(e) => set('cardContactText', e.target.value)} /></div>
            )}
            <div className="field full"><label>Mensagem de agradecimento</label><textarea rows={3} placeholder="Mostrada após o envio do formulário" value={form.thankYouText} onChange={(e) => set('thankYouText', e.target.value)} /></div>
            <div className="field full"><label>Link do grupo</label><input placeholder="https://chat.whatsapp.com/..." value={form.joinGroupLink} onChange={(e) => set('joinGroupLink', e.target.value)} /></div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleNextFromInfo} disabled={saving}>{saving ? 'Salvando...' : 'Continuar →'}</button>
          </div>
        </>
      )}

      {step === 'itens' && (
        <>
          <div className="field full" style={{ marginBottom: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setMembersModalOpen(true)}>🧑‍🤝‍🧑 Gerenciar membros</button>
          </div>
          {localItems.map((it, idx) => (
            <div className="form-grid" key={it._tempKey} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div className="field full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                <b>Item {idx + 1}</b>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} disabled={idx === 0} onClick={() => moveItem(it._tempKey, -1)}>↑</button>
                  <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} disabled={idx === localItems.length - 1} onClick={() => moveItem(it._tempKey, 1)}>↓</button>
                  <button type="button" className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => removeItem(it._tempKey)}>🗑</button>
                </div>
              </div>
              <div className="field full">
                <label>Foto do item</label>
                <div className="photo-upload-row">
                  <div className="photo-preview">{it.photoUrl ? <img src={it.photoUrl} alt="" /> : <span>🖼️</span>}</div>
                  <div className="photo-upload-actions">
                    <input type="file" id={`photoInput-${it._tempKey}`} accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoChange(it._tempKey, e)} />
                    <button type="button" className="btn btn-ghost" onClick={() => document.getElementById(`photoInput-${it._tempKey}`).click()}>📷 Escolher foto</button>
                    {it.photoUrl && <button type="button" className="btn btn-danger" onClick={() => updateItem(it._tempKey, { photoUrl: null, photoFile: null })}>🗑 Remover foto</button>}
                  </div>
                </div>
              </div>
              <div className="field"><label>Nome</label><input placeholder="Ex: SKZOO Secret Mini Charm" value={it.name} onChange={(e) => updateItem(it._tempKey, { name: e.target.value })} /></div>
              <div className="field"><label>Preço (R$)</label><input value={it.price} onChange={(e) => updateItem(it._tempKey, { price: e.target.value })} /></div>
              <div className="field full"><label>Instruções</label><input placeholder="Ex: 3x Wolfchan, 1x Jiniret" value={it.instructions} onChange={(e) => updateItem(it._tempKey, { instructions: e.target.value })} /></div>
              <div className="field full">
                <label>Tipo de seleção</label>
                <select value={it.selectionType} onChange={(e) => updateItem(it._tempKey, { selectionType: e.target.value })}>
                  {Object.entries(SELECTION_TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
              {it.selectionType !== 'random' && (
                <div className="field full">
                  <label>Opções (membros)</label>
                  {members.length === 0 ? (
                    <p className="hint">Nenhum membro cadastrado ainda — clique em "Gerenciar membros" acima.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {members.map((m) => (
                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, textTransform: 'none', fontWeight: 500, color: 'var(--ink)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={it.optionMemberIds.includes(m.id)} onChange={() => toggleOption(it._tempKey, m.id)} />
                          {m.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addItem}>+ Adicionar item</button>
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep('info')}>← Voltar</button>
            <button className="btn btn-primary" onClick={handleNextFromItens} disabled={saving}>{saving ? 'Salvando...' : 'Continuar →'}</button>
          </div>
        </>
      )}

      {step === 'revisao' && (
        <>
          <p className="hint">Link público deste formulário:</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input readOnly value={publicUrl} style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-ghost" onClick={handleCopy}>{copied ? '✓ Copiado' : '🔗 Copiar'}</button>
          </div>
          <div className="lock-note">
            <span>Status atual: <b>{formRow.status === 'open' ? '🟢 Aberto' : '🔒 Encerrado'}</b></span>
            <button className="btn btn-sage" style={{ marginLeft: 'auto' }} onClick={toggleStatus}>
              {formRow.status === 'open' ? 'Encerrar formulário' : 'Reabrir formulário'}
            </button>
          </div>
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep('itens')}>← Voltar</button>
            <button className="btn btn-primary" onClick={handleFinish}>✓ Concluir</button>
          </div>
        </>
      )}

      {membersModalOpen && <MembersModal onClose={() => setMembersModalOpen(false)} />}
    </Modal>
  );
}
