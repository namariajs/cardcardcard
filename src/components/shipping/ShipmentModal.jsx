import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { itemDisplayTitle, formatClaimDate } from '../../lib/format';
import PhotoThumb from '../shared/PhotoThumb';
import Modal from '../shared/Modal';
import ConfirmModal from '../shared/ConfirmModal';

export default function ShipmentModal({ requestId, onClose }) {
  const { items, unlocked, shippingRequests, updateShippingRequest, cancelShippingRequest } = useApp();
  const req = shippingRequests.find((r) => r.id === requestId);
  const [freteTotal, setFreteTotal] = useState(req?.freteTotal ?? '');
  const [rastreio, setRastreio] = useState(req?.rastreio ?? '');
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (!req) return null;
  const its = req.itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);

  function applyFrete() {
    const total = parseFloat(String(freteTotal).replace(',', '.')) || 0;
    updateShippingRequest(req.id, (r) => ({
      freteTotal: total,
      pagFrete: r.pagFrete !== 'PAGO' ? 'PENDENTE' : r.pagFrete,
      status: 'PROCESSADO',
      processedAt: new Date().toISOString(),
    }));
    onClose();
  }

  function saveRastreio() {
    const val = rastreio.trim();
    updateShippingRequest(req.id, { rastreio: val, rastreioAt: val ? new Date().toISOString() : null });
    onClose();
  }

  function openCorreios() {
    if (!rastreio.trim()) { alert('Informe um código de rastreio primeiro.'); return; }
    window.open('https://rastreamento.correios.com.br/app/index.php?objetos=' + encodeURIComponent(rastreio.trim()), '_blank');
  }

  return (
    <>
      <Modal onClose={onClose} maxWidth={640}>
        <h3>📦 Itens combinados — {req.joiner}</h3>
        <p className="hint">{its.length} {its.length === 1 ? 'item' : 'itens'} · Solicitado em {formatClaimDate(req.submittedAt)}{req.status === 'PROCESSADO' ? ' · Já processado' : ''}</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          {its.map((it) => (
            <div className="item-card" key={it.id}>
              <PhotoThumb item={it} />
              <div className="item-content">
                <div className="item-name">{itemDisplayTitle(it)}</div>
                {unlocked && <div className="item-id mono">{it.id}</div>}
                <div className="meta-row"><b>CEG:</b> {it.ceg || '—'}</div>
              </div>
            </div>
          ))}
        </div>

        {req.endereco && (
          <div className="field full" style={{ marginTop: 16 }}>
            <label>Endereço de entrega</label>
            <div style={{ border: '1px solid var(--border)', borderRadius: 11, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.9, background: '#fff' }}>
              <div><b>Nome:</b> {req.endereco.nome}</div>
              <div><b>Rua/Avenida:</b> {req.endereco.rua}</div>
              <div><b>Número:</b> {req.endereco.numero}</div>
              {req.endereco.complemento && <div><b>Complemento:</b> {req.endereco.complemento}</div>}
              <div><b>Bairro:</b> {req.endereco.bairro}</div>
              <div><b>Cidade:</b> {req.endereco.cidade}</div>
              <div><b>Estado:</b> {req.endereco.estado}</div>
              <div><b>CEP:</b> {req.endereco.cep}</div>
              <div><b>CPF:</b> {req.endereco.cpf}</div>
              {req.endereco.obs && <div style={{ marginTop: 6 }}><b>Obs.:</b> {req.endereco.obs}</div>}
            </div>
          </div>
        )}

        <div className="field full" style={{ marginTop: 16 }}>
          <label>Valor total do frete nacional (R$)</label>
          <input placeholder="0.00" value={freteTotal} onChange={(e) => setFreteTotal(e.target.value)} />
          <div className="caixa-hint">Um único valor para o envio combinado inteiro — não é dividido entre os itens.</div>
        </div>

        {req.status === 'PROCESSADO' && (
          <div className="field full" style={{ marginTop: 16 }}>
            <label>Código de rastreio (Correios)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Ex: AB123456789BR" style={{ flex: 1 }} value={rastreio} onChange={(e) => setRastreio(e.target.value)} />
              <button className="btn btn-outline" type="button" onClick={openCorreios}>🔗 Ver nos Correios</button>
            </div>
            <div className="caixa-hint">{req.pagFrete === 'PAGO' ? 'Assim que salvo, o joiner vê esse código na aba Frete Nacional.' : 'O joiner só vê esse código depois que o pagamento do frete for confirmado.'}</div>
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger" onClick={() => setConfirmingCancel(true)}>🗑 Cancelar solicitação</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
            {req.status === 'PROCESSADO' && <button className="btn btn-primary" onClick={saveRastreio}>💾 Salvar rastreio</button>}
            <button className="btn btn-primary" onClick={applyFrete}>💾 Salvar valor do frete</button>
          </div>
        </div>
      </Modal>

      {confirmingCancel && (
        <ConfirmModal
          title="🗑 Cancelar solicitação?"
          message="Os itens voltam a ficar disponíveis para uma nova solicitação de envio. Essa ação não pode ser desfeita."
          confirmLabel="Sim, cancelar"
          onCancel={() => setConfirmingCancel(false)}
          onConfirm={() => { cancelShippingRequest(req.id); setConfirmingCancel(false); onClose(); }}
        />
      )}
    </>
  );
}
