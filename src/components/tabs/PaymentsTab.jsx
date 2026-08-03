import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveJoinerInput } from '../../lib/joiners';
import { pendingClaims, claimFor, paymentFieldVisibleForStage } from '../../lib/calc';
import { fmt, itemDisplayTitle, formatClaimDate } from '../../lib/format';
import { PAYMENT_FIELDS } from '../../lib/constants';
import { saveReceipt, readFileAsDataURL, resizeImageFile } from '../../lib/storage';
import PayFieldRow from '../shared/PayFieldRow';
import ReceiptModal from '../shared/ReceiptModal';
import ConfirmModal from '../shared/ConfirmModal';

export default function PaymentsTab() {
  const {
    items, unlocked, registry, paymentClaims, shippingRequests,
    submitPaymentClaim, cancelPaymentClaim, confirmPaymentClaim, cancelShippingRequest,
  } = useApp();
  const [handle, setHandle] = useState('');
  const [inputDraft, setInputDraft] = useState('');
  const [viewingReceiptId, setViewingReceiptId] = useState(null);
  const [cancelingShipId, setCancelingShipId] = useState(null);

  const claims = useMemo(() => pendingClaims(paymentClaims), [paymentClaims]);

  function doLookup() {
    const raw = inputDraft.trim();
    if (!raw) return;
    const resolved = resolveJoinerInput(registry, raw);
    if (resolved.value) setHandle(resolved.value);
  }

  const mine = useMemo(() => (handle ? items.filter((it) => it.joiner.toLowerCase() === handle.toLowerCase()) : []), [items, handle]);
  const withPending = useMemo(() => mine.map((it) => ({
    it,
    fields: PAYMENT_FIELDS.filter((f) => (it[f.pagField] === 'PENDENTE' || it[f.pagField] === 'ATRASADO') && paymentFieldVisibleForStage(f.key, it.statusCeg, it.tipo)),
  })).filter((x) => x.fields.length > 0), [mine]);

  const myShipments = useMemo(() => (handle ? shippingRequests.filter((r) => r.joiner.toLowerCase() === handle.toLowerCase() && r.status === 'PROCESSADO' && r.pagFrete !== 'PAGO') : []), [shippingRequests, handle]);

  async function handleSubmitClaim(itemId, fieldKey, { method, note, file }) {
    const claimId = crypto.randomUUID ? crypto.randomUUID() : 'PAY-' + Date.now();
    let hasReceipt = false;
    if (file) {
      try {
        const dataUrl = file.type === 'application/pdf' ? await readFileAsDataURL(file) : await resizeImageFile(file, 1000, 0.85);
        hasReceipt = await saveReceipt(claimId, dataUrl);
      } catch {
        alert('Não foi possível anexar o comprovante, mas o aviso será enviado sem ele.');
      }
    }
    submitPaymentClaim({ id: claimId, itemId, fieldKey, joiner: handle, method, note, hasReceipt });
  }

  return (
    <>
      {unlocked && (
        <div className="gom-claims-box">
          <h3>🔔 Pagamentos aguardando verificação</h3>
          <p>{claims.length === 0 ? 'Nenhum aviso de pagamento pendente no momento.' : 'Confira os detalhes de cada aviso e confirme com um clique.'}</p>
          {claims.map((c) => {
            let title, label, amount;
            if (c.fieldKey === 'envioNacional') {
              const req = shippingRequests.find((r) => r.id === c.itemId);
              title = req ? `Envio combinado (${req.itemIds.length} ${req.itemIds.length === 1 ? 'item' : 'itens'})` : '(solicitação removida)';
              label = 'Frete Nacional';
              amount = req ? fmt(Number(req.freteTotal) || 0) : '—';
            } else {
              const it = items.find((i) => i.id === c.itemId);
              const fieldDef = PAYMENT_FIELDS.find((f) => f.key === c.fieldKey);
              title = it ? itemDisplayTitle(it) : '(item removido)';
              label = fieldDef ? fieldDef.label : '';
              amount = it && fieldDef ? fmt(Number(it[fieldDef.valField]) || 0) : '—';
            }
            return (
              <div className="claim-row" key={c.id}>
                <div className="claim-info">
                  <b>{title}</b> — {label} · {amount}<br />
                  Joiner: <b>{c.joiner}</b> · Método: {c.method || '—'} · Avisado em {formatClaimDate(c.submittedAt)}
                  {c.note && <><br />Obs.: {c.note}</>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.hasReceipt && <button className="btn btn-outline" onClick={() => setViewingReceiptId(c.id)}>📎 Ver comprovante</button>}
                  <button className="btn btn-sage" onClick={() => confirmPaymentClaim(c.id)}>✔ Confirmar pagamento</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="panel-intro">
        <h3>💳 Avisar pagamento</h3>
        <p>Digite seu @ ou telefone para ver seus itens pendentes e avisar quando pagar.</p>
        <div className="panel-lookup-row">
          <input type="text" placeholder="@seuusuario ou telefone (ex: 11912345678)" value={inputDraft}
            onChange={(e) => setInputDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }} />
          <button className="btn btn-primary" onClick={doLookup}>🔎 Ver meus pagamentos</button>
          {handle && <button className="btn btn-ghost" onClick={() => { setHandle(''); setInputDraft(''); }}>✕ Limpar</button>}
        </div>
      </div>

      {handle && mine.length === 0 && myShipments.length === 0 && (
        <div className="empty"><b>Nenhum item encontrado para {handle}</b>Confira se digitou o @ ou telefone certinho.</div>
      )}
      {handle && (mine.length > 0 || myShipments.length > 0) && withPending.length === 0 && myShipments.length === 0 && (
        <div className="empty"><b>Tudo certo por aqui! 🎉</b>Você não tem nenhum pagamento pendente no momento.</div>
      )}

      {withPending.map(({ it, fields }) => (
        <div className="pay-card" key={it.id}>
          <div className="pay-card-head">
            <h4>{itemDisplayTitle(it)}</h4>
            <span>{it.ceg || ''}</span>
          </div>
          {fields.map((f) => {
            const claim = claimFor(paymentClaims, it.id, f.key);
            return (
              <PayFieldRow
                key={f.key}
                label={f.label}
                amount={fmt(Number(it[f.valField]) || 0)}
                isLate={it[f.pagField] === 'ATRASADO'}
                existingClaim={claim}
                onSubmit={(data) => handleSubmitClaim(it.id, f.key, data)}
                onCancelClaim={cancelPaymentClaim}
                onViewReceipt={setViewingReceiptId}
              />
            );
          })}
        </div>
      ))}

      {myShipments.map((r) => {
        const claim = claimFor(paymentClaims, r.id, 'envioNacional');
        return (
          <div className="pay-card" key={r.id}>
            <div className="pay-card-head">
              <h4>📦 Envio combinado</h4>
              <span>{r.itemIds.length} {r.itemIds.length === 1 ? 'item' : 'itens'} · Solicitado em {formatClaimDate(r.submittedAt)}</span>
            </div>
            <PayFieldRow
              label="Frete Nacional"
              amount={fmt(Number(r.freteTotal) || 0)}
              isLate={false}
              existingClaim={claim}
              onSubmit={(data) => handleSubmitClaim(r.id, 'envioNacional', data)}
              onCancelClaim={cancelPaymentClaim}
              onViewReceipt={setViewingReceiptId}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5, color: 'var(--pink-deep)' }} onClick={() => setCancelingShipId(r.id)}>
                🗑 Cancelar solicitação de envio
              </button>
            </div>
          </div>
        );
      })}

      {viewingReceiptId && <ReceiptModal claimId={viewingReceiptId} onClose={() => setViewingReceiptId(null)} />}
      {cancelingShipId && (
        <ConfirmModal
          title="🗑 Cancelar solicitação de envio?"
          message="Os itens combinados voltam a ficar disponíveis para uma nova solicitação de envio. Essa ação não pode ser desfeita."
          confirmLabel="Sim, cancelar"
          onCancel={() => setCancelingShipId(null)}
          onConfirm={() => { cancelShippingRequest(cancelingShipId); setCancelingShipId(null); }}
        />
      )}
    </>
  );
}
