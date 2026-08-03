import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { itemDisplayTitle, formatCEP, formatCPF } from '../../lib/format';
import { BR_STATES } from '../../lib/constants';
import Modal from '../shared/Modal';

const BLANK_ADDR = { nome: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '', cpf: '', obs: '' };

export default function ShippingWizard({ itemIds, joiner, onClose, onDone }) {
  const { items, createShippingRequest } = useApp();
  const [step, setStep] = useState('confirm'); // 'confirm' | 'form' | 'success'
  const [addr, setAddr] = useState(BLANK_ADDR);
  const [error, setError] = useState('');

  const its = itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);

  function set(field, value) { setAddr((a) => ({ ...a, [field]: value })); }

  function handleSubmit() {
    const { nome, rua, numero, bairro, cidade, estado, cep, cpf } = addr;
    if (!nome || !rua || !numero || !bairro || !cidade || !estado || !cep || !cpf) {
      setError('Preencha todos os campos obrigatórios (Complemento e Observações são opcionais) antes de confirmar.');
      return;
    }
    createShippingRequest({ joiner, itemIds, endereco: { ...addr } });
    setStep('success');
  }

  if (step === 'success') {
    return (
      <Modal onClose={() => { onClose(); onDone?.(); }} maxWidth={440}>
        <div style={{ fontSize: 40, marginBottom: 6, textAlign: 'center' }}>📦</div>
        <h3 style={{ textAlign: 'center' }}>Solicitação concluída</h3>
        <p className="hint" style={{ marginBottom: 0, textAlign: 'center' }}>Solicitação concluída. Seus itens serão embalados e o seu frete calculado em breve.</p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => { onClose(); onDone?.(); }}>Ok, entendi</button>
        </div>
      </Modal>
    );
  }

  if (step === 'confirm') {
    return (
      <Modal onClose={onClose} maxWidth={520}>
        <h3>📦 Confirmar solicitação de envio</h3>
        <p className="hint">Você selecionou {its.length} {its.length === 1 ? 'item' : 'itens'} para solicitar o envio nacional:</p>
        <ul style={{ margin: '10px 0 18px', paddingLeft: 20, fontSize: 13.5, color: 'var(--ink-soft)' }}>
          {its.map((it) => <li key={it.id}>{itemDisplayTitle(it)}</li>)}
        </ul>
        <p className="hint" style={{ marginBottom: 0 }}>No próximo passo você vai preencher os dados de entrega. Deseja continuar?</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Voltar</button>
          <button className="btn btn-primary" onClick={() => setStep('form')}>Continuar →</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} maxWidth={640}>
      <h3>📦 Dados para envio nacional</h3>
      <p className="hint">Preencha os dados de entrega para os itens combinados.</p>
      {error && <p className="hint" style={{ color: 'var(--pink-deep)' }}>{error}</p>}
      <div className="form-grid">
        <div className="field full"><label>Nome Completo</label><input placeholder="Nome completo do destinatário" value={addr.nome} onChange={(e) => set('nome', e.target.value)} /></div>
        <div className="field"><label>Rua/Avenida</label><input placeholder="Rua/Avenida" value={addr.rua} onChange={(e) => set('rua', e.target.value)} /></div>
        <div className="field"><label>Número</label><input placeholder="Nº" value={addr.numero} onChange={(e) => set('numero', e.target.value)} /></div>
        <div className="field"><label>Complemento</label><input placeholder="Apto, bloco, referência... (opcional)" value={addr.complemento} onChange={(e) => set('complemento', e.target.value)} /></div>
        <div className="field"><label>Bairro</label><input placeholder="Bairro" value={addr.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
        <div className="field"><label>Cidade</label><input placeholder="Cidade" value={addr.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
        <div className="field">
          <label>Estado</label>
          <select value={addr.estado} onChange={(e) => set('estado', e.target.value)}>
            <option value="">Selecione</option>
            {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div className="field"><label>CEP</label><input inputMode="numeric" placeholder="00000-000" value={addr.cep} onChange={(e) => set('cep', formatCEP(e.target.value))} /></div>
        <div className="field full">
          <label>CPF</label>
          <input inputMode="numeric" placeholder="000.000.000-00" value={addr.cpf} onChange={(e) => set('cpf', formatCPF(e.target.value))} />
          <div className="caixa-hint">Os correios passaram a solicitar o CPF do destinatário após a mudança de uma norma. Os dados não ficarão armazenados.</div>
        </div>
        <div className="field full">
          <label>Observações</label>
          <textarea rows={3} placeholder="Alguma observação ou mensagem? (opcional)" value={addr.obs} onChange={(e) => set('obs', e.target.value)} />
        </div>
      </div>
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => setStep('confirm')}>← Voltar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>📦 Confirmar solicitação</button>
      </div>
    </Modal>
  );
}
