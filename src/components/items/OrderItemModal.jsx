import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveJoinerInput } from '../../lib/joiners';
import { formatPhoneBR, normHandle, onlyDigits, genOrderId, itemDisplayTitle } from '../../lib/format';
import Modal from '../shared/Modal';

const BLANK_CADASTRO = { apelido: '', nomeCompleto: '', phone: '', social: '' };

export default function OrderItemModal({ item, onClose }) {
  const { registry, submitItemOrder } = useApp();
  const [step, setStep] = useState('lookup'); // 'lookup' | 'confirm' | 'cadastro' | 'done'
  const [lookupInput, setLookupInput] = useState('');
  const [match, setMatch] = useState(null);
  const [form, setForm] = useState(BLANK_CADASTRO);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleLookup() {
    const raw = lookupInput.trim();
    if (!raw) return;
    const r = resolveJoinerInput(registry, raw);
    if (r.match) {
      setMatch(r.match);
      setStep('confirm');
    } else {
      // Prefill whatever can be inferred from what they typed, so they don't retype it.
      const digits = onlyDigits(raw);
      setForm({
        ...BLANK_CADASTRO,
        phone: digits.length >= 8 ? formatPhoneBR(raw) : '',
        social: raw.includes('@') ? normHandle(raw) : '',
      });
      setStep('cadastro');
    }
  }

  function handleConfirmMatch() {
    submitItemOrder({
      id: genOrderId(),
      itemId: item.id,
      resolvedJoiner: match.social,
      pendingCadastro: null,
      requestedAt: new Date().toISOString(),
      status: 'PENDENTE',
    });
    setStep('done');
  }

  function handleSubmitCadastro() {
    const apelido = form.apelido.trim();
    const social = normHandle(form.social.trim());
    if (!apelido) { alert('Informe seu apelido.'); return; }
    if (!social) { alert('Informe seu @.'); return; }
    submitItemOrder({
      id: genOrderId(),
      itemId: item.id,
      resolvedJoiner: null,
      pendingCadastro: { apelido, nomeCompleto: form.nomeCompleto.trim(), phone: form.phone.trim(), social },
      requestedAt: new Date().toISOString(),
      status: 'PENDENTE',
    });
    setStep('done');
  }

  return (
    <Modal onClose={onClose}>
      <h3>📩 Pedir este item</h3>
      <p className="hint">{itemDisplayTitle(item)}</p>

      {step === 'lookup' && (
        <>
          <div className="field full">
            <label>Seu @ ou telefone</label>
            <input placeholder="@usuario ou (11) 91234-5678" value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleLookup}>Continuar</button>
          </div>
        </>
      )}

      {step === 'confirm' && match && (
        <>
          <p>Encontramos seu cadastro:</p>
          <div className="meta-row"><b>{match.apelido}</b>{match.nomeCompleto ? ' — ' + match.nomeCompleto : ''} ({match.social})</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleConfirmMatch}>Confirmar pedido</button>
          </div>
        </>
      )}

      {step === 'cadastro' && (
        <>
          <p className="hint">Não encontramos esse @ ou telefone no Cadastro. Preencha seus dados para pedir este item — seu cadastro só é criado de fato se a GOM aprovar o pedido.</p>
          <div className="form-grid">
            <div className="field full"><label>Apelido</label><input placeholder="Como a GOM te chama" value={form.apelido} onChange={(e) => set('apelido', e.target.value)} /></div>
            <div className="field full"><label>Nome Completo</label><input placeholder="Nome completo" value={form.nomeCompleto} onChange={(e) => set('nomeCompleto', e.target.value)} /></div>
            <div className="field full"><label>Telefone</label><input inputMode="numeric" placeholder="(11) 91234-5678" value={form.phone} onChange={(e) => set('phone', formatPhoneBR(e.target.value))} /></div>
            <div className="field full"><label>Social (@)</label><input placeholder="@usuario" value={form.social} onChange={(e) => set('social', e.target.value)} /></div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmitCadastro}>Enviar pedido</button>
          </div>
        </>
      )}

      {step === 'done' && (
        <>
          <div className="modal-success-msg">✅ Pedido enviado! A GOM irá entrar em contato via WhatsApp caso você tenha conseguido o item.</div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>Fechar</button>
          </div>
        </>
      )}
    </Modal>
  );
}
