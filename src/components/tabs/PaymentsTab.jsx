import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { resolveJoinerInput } from '../../lib/joiners';
import { pendingClaims, claimFor, paymentFieldVisibleForStage, paymentFieldEffective } from '../../lib/calc';
import { fmt, itemDisplayTitle, formatClaimDate, hasVal, genId } from '../../lib/format';
import { PAYMENT_FIELDS, BLANK_ITEM } from '../../lib/constants';
import { saveReceipt, readFileAsDataURL, resizeImageFile } from '../../lib/storage';
import PayFieldRow from '../shared/PayFieldRow';
import ReceiptModal from '../shared/ReceiptModal';
import ConfirmModal from '../shared/ConfirmModal';

export default function PaymentsTab() {
  const {
    items, unlocked, registry, paymentClaims, shippingRequests, upsertItem,
    submitPaymentClaim, submitBatchPaymentClaim, cancelPaymentClaim, confirmPaymentClaim, confirmBatchPaymentClaim, cancelShippingRequest,
  } = useApp();
  const [handle, setHandle] = useState('');
  const [inputDraft, setInputDraft] = useState('');
  const [viewingReceiptClaim, setViewingReceiptClaim] = useState(null);
  const [cancelingShipId, setCancelingShipId] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [batchMethod, setBatchMethod] = useState('PIX');
  const [batchNote, setBatchNote] = useState('');
  const [batchFile, setBatchFile] = useState(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [processingSubmissionIds, setProcessingSubmissionIds] = useState(new Set());

  const loadPendingSubmissions = useCallback(async () => {
    if (!unlocked) return;
    const { data, error } = await supabase
      .from('form_submissions')
      .select(`
        *,
        forms ( id, title ),
        cadastro:cadastro_id ( apelido, nome_completo, phone, social ),
        form_submission_items (
          quantity,
          form_items ( id, name, price ),
          form_item_options ( member_id, members ( name ) )
        )
      `)
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true });
    if (error) { console.error('PaymentsTab: failed to load pending form submissions', error); return; }
    setPendingSubmissions(data || []);
  }, [unlocked]);

  useEffect(() => { loadPendingSubmissions(); }, [loadPendingSubmissions]);

  function submissionItemsSummary(submission) {
    return (submission.form_submission_items || [])
      .map((si) => {
        const name = si.form_items?.name || '—';
        const optionName = si.form_item_options?.members?.name;
        return `${optionName ? `${optionName} — ${name}` : name} x${si.quantity || 1}`;
      })
      .join('; ');
  }

  // The update's WHERE clause (processing_status still 'pending') is the idempotency
  // guard, not a separate read-then-write check — Postgres only lets one such update
  // actually match a row, so a double-click or two overlapping approval attempts can
  // never both pass this and create two sets of items for the same submission.
  async function handleApproveSubmission(submission) {
    setProcessingSubmissionIds((prev) => new Set(prev).add(submission.id));
    try {
      const { data: claimed, error: claimError } = await supabase
        .from('form_submissions')
        .update({ processing_status: 'approved' })
        .eq('id', submission.id)
        .eq('processing_status', 'pending')
        .select();
      if (claimError) { alert('Não foi possível aprovar esta resposta.'); console.error(claimError); return; }
      if (!claimed || claimed.length === 0) { await loadPendingSubmissions(); return; }

      const joinerHandle = submission.cadastro?.social || '';
      const paidAt = new Date().toISOString();
      (submission.form_submission_items || []).forEach((si) => {
        const qty = si.quantity || 1;
        for (let i = 0; i < qty; i++) {
          upsertItem({
            ...BLANK_ITEM,
            id: genId(),
            joiner: joinerHandle,
            unclaimed: !joinerHandle,
            itemName: si.form_items?.name || 'Item sem nome',
            membro: si.form_item_options?.members?.name || '-',
            valorItem: Number(si.form_items?.price) || 0,
            tipo: 'VENDA',
            pagItem: 'PAGO',
            pagItemPaidAt: paidAt,
            ceg: submission.forms?.title || '',
            notes: `Formulário: ${submission.forms?.title || ''}`,
            formSubmissionId: submission.id,
            photoPending: true,
          });
        }
      });
      await loadPendingSubmissions();
    } finally {
      setProcessingSubmissionIds((prev) => { const next = new Set(prev); next.delete(submission.id); return next; });
    }
  }

  async function handleRejectSubmission(submission) {
    setProcessingSubmissionIds((prev) => new Set(prev).add(submission.id));
    try {
      const { error } = await supabase.from('form_submissions').update({ processing_status: 'rejected' }).eq('id', submission.id).eq('processing_status', 'pending');
      if (error) { alert('Não foi possível rejeitar esta resposta.'); console.error(error); }
      await loadPendingSubmissions();
    } finally {
      setProcessingSubmissionIds((prev) => { const next = new Set(prev); next.delete(submission.id); return next; });
    }
  }

  const claims = useMemo(() => pendingClaims(paymentClaims), [paymentClaims]);
  const groupedClaims = useMemo(() => {
    const seen = new Set();
    const groups = [];
    claims.forEach((c) => {
      if (c.batchId) {
        if (seen.has(c.batchId)) return;
        seen.add(c.batchId);
        groups.push(claims.filter((x) => x.batchId === c.batchId));
      } else {
        groups.push([c]);
      }
    });
    return groups;
  }, [claims]);

  function clearSelection() { setSelectedKeys(new Set()); }

  function doLookup() {
    const raw = inputDraft.trim();
    if (!raw) return;
    const resolved = resolveJoinerInput(registry, raw);
    if (resolved.value) { setHandle(resolved.value); clearSelection(); }
  }

  const mine = useMemo(() => (handle ? items.filter((it) => it.joiner.toLowerCase() === handle.toLowerCase()) : []), [items, handle]);
  const withPending = useMemo(() => mine.map((it) => ({
    it,
    fields: PAYMENT_FIELDS.filter((f) => (it[f.pagField] === 'PENDENTE' || it[f.pagField] === 'ATRASADO') && paymentFieldVisibleForStage(f.key, it.statusCeg, it.tipo) && hasVal(it[f.valField])),
  })).filter((x) => x.fields.length > 0), [mine]);

  const allFieldEntries = useMemo(() => withPending.flatMap(({ it, fields }) => fields.map((f) => ({ it, f, key: `${it.id}::${f.key}` }))), [withPending]);
  const selectedEntries = useMemo(() => allFieldEntries.filter((e) => selectedKeys.has(e.key)), [allFieldEntries, selectedKeys]);
  const selectedTotal = useMemo(() => selectedEntries.reduce((sum, e) => sum + paymentFieldEffective(e.it, e.f).total, 0), [selectedEntries]);
  const batchModeActive = selectedEntries.length >= 2;

  function toggleFieldSelected(itemId, fieldKey) {
    const key = `${itemId}::${fieldKey}`;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

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

  async function handleSubmitBatchClaim() {
    if (selectedEntries.length < 2) return;
    setBatchSubmitting(true);
    const batchId = crypto.randomUUID ? crypto.randomUUID() : 'BATCH-' + Date.now();
    let hasReceipt = false;
    if (batchFile) {
      try {
        const dataUrl = batchFile.type === 'application/pdf' ? await readFileAsDataURL(batchFile) : await resizeImageFile(batchFile, 1000, 0.85);
        hasReceipt = await saveReceipt(batchId, dataUrl);
      } catch {
        alert('Não foi possível anexar o comprovante, mas o aviso será enviado sem ele.');
      }
    }
    const entries = selectedEntries.map((e) => ({ itemId: e.it.id, fieldKey: e.f.key }));
    submitBatchPaymentClaim({ batchId, entries, joiner: handle, method: batchMethod, note: batchNote, hasReceipt });
    clearSelection();
    setBatchMethod('PIX'); setBatchNote(''); setBatchFile(null);
    setBatchSubmitting(false);
  }

  return (
    <>
      {unlocked && pendingSubmissions.length > 0 && (
        <div className="gom-claims-box">
          <h3>📝 Respostas de formulário aguardando aprovação</h3>
          <p>Aprovar cria os itens automaticamente (já marcados como pagos); rejeitar não cria nada.</p>
          {pendingSubmissions.map((s) => {
            const isProcessing = processingSubmissionIds.has(s.id);
            return (
              <div className="claim-row" key={s.id}>
                <div className="claim-info">
                  <b>{s.forms?.title || '(formulário removido)'}</b><br />
                  {s.cadastro?.apelido || '—'}{s.cadastro?.nome_completo ? ' — ' + s.cadastro.nome_completo : ''}
                  {s.cadastro?.phone ? ' · ' + s.cadastro.phone : ''}{s.cadastro?.social ? ' · ' + s.cadastro.social : ''}
                  <br />{submissionItemsSummary(s)}
                  <br />Total: <b>{fmt(s.amount_paid)}</b> · {s.payment_method === 'pix' ? 'Pix' : 'Cartão'} · Enviado em {formatClaimDate(s.created_at)}
                  {s.comments && <><br />Obs.: {s.comments}</>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.receipt_file_url && <a className="btn btn-outline" href={s.receipt_file_url} target="_blank" rel="noopener noreferrer">📎 Ver comprovante</a>}
                  {s.receipt_drive_link && <a className="btn btn-outline" href={s.receipt_drive_link} target="_blank" rel="noopener noreferrer">🔗 Link Drive</a>}
                  <button className="btn btn-danger" disabled={isProcessing} onClick={() => handleRejectSubmission(s)}>✕ Rejeitar</button>
                  <button className="btn btn-sage" disabled={isProcessing} onClick={() => handleApproveSubmission(s)}>✔ Aprovar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {unlocked && (
        <div className="gom-claims-box">
          <h3>🔔 Pagamentos aguardando verificação</h3>
          <p>{groupedClaims.length === 0 ? 'Nenhum aviso de pagamento pendente no momento.' : 'Confira os detalhes de cada aviso e confirme com um clique.'}</p>
          {groupedClaims.map((group) => {
            const first = group[0];
            const rows = group.map((c) => {
              let title, label, amountNum, feeNote;
              if (c.fieldKey === 'envioNacional') {
                const req = shippingRequests.find((r) => r.id === c.itemId);
                title = req ? `Envio combinado (${req.itemIds.length} ${req.itemIds.length === 1 ? 'item' : 'itens'})` : '(solicitação removida)';
                label = 'Frete Nacional';
                amountNum = req ? Number(req.freteTotal) || 0 : 0;
              } else {
                const it = items.find((i) => i.id === c.itemId);
                const fieldDef = PAYMENT_FIELDS.find((f) => f.key === c.fieldKey);
                title = it ? itemDisplayTitle(it) : '(item removido)';
                label = fieldDef ? fieldDef.label : '';
                if (it && fieldDef) {
                  const eff = paymentFieldEffective(it, fieldDef);
                  amountNum = eff.total;
                  if (eff.fee > 0) feeNote = `+ ${fmt(eff.fee)} de atraso (${eff.lateDays} ${eff.lateDays === 1 ? 'dia' : 'dias'})`;
                } else {
                  amountNum = 0;
                }
              }
              return { c, title, label, amountNum, feeNote };
            });
            const total = rows.reduce((sum, r) => sum + r.amountNum, 0);
            return (
              <div className="claim-row" key={first.batchId || first.id}>
                <div className="claim-info">
                  {rows.map((r) => (
                    <div key={r.c.id}>
                      <b>{r.title}</b> — {r.label} · {fmt(r.amountNum)}
                      {r.feeNote && <span className="late-fee-note" style={{ marginLeft: 6 }}>{r.feeNote}</span>}
                    </div>
                  ))}
                  {rows.length > 1 && <div>Total combinado: <b>{fmt(total)}</b></div>}
                  <div>Joiner: <b>{first.joiner}</b> · Método: {first.method || '—'} · Avisado em {formatClaimDate(first.submittedAt)}</div>
                  {first.note && <div>Obs.: {first.note}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {first.hasReceipt && <button className="btn btn-outline" onClick={() => setViewingReceiptClaim(first)}>📎 Ver comprovante</button>}
                  <button className="btn btn-sage" onClick={() => (first.batchId ? confirmBatchPaymentClaim(first.batchId) : confirmPaymentClaim(first.id))}>✔ Confirmar pagamento</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="panel-intro">
        <h3>💳 Avisar pagamento</h3>
        <p>Digite seu @ ou telefone para ver seus itens pendentes e avisar quando pagar.</p>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: -10 }}>
          Pagou mais de um item de uma vez? Selecione todos os itens e envie um único aviso com o comprovante.
        </p>
        <div className="panel-lookup-row">
          <input type="text" placeholder="@seuusuario ou telefone (ex: 11912345678)" value={inputDraft}
            onChange={(e) => setInputDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }} />
          <button className="btn btn-primary" onClick={doLookup}>🔎 Ver meus pagamentos</button>
          {handle && <button className="btn btn-ghost" onClick={() => { setHandle(''); setInputDraft(''); clearSelection(); }}>✕ Limpar</button>}
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
            const key = `${it.id}::${f.key}`;
            const eff = paymentFieldEffective(it, f);
            return (
              <PayFieldRow
                key={f.key}
                label={f.label}
                amount={fmt(eff.total)}
                isLate={eff.status === 'ATRASADO'}
                feeNote={eff.fee > 0 ? `+ ${fmt(eff.fee)} de atraso (${eff.lateDays} ${eff.lateDays === 1 ? 'dia' : 'dias'})` : null}
                existingClaim={claim}
                onSubmit={(data) => handleSubmitClaim(it.id, f.key, data)}
                onCancelClaim={cancelPaymentClaim}
                onViewReceipt={setViewingReceiptClaim}
                checked={selectedKeys.has(key)}
                onToggleCheck={() => toggleFieldSelected(it.id, f.key)}
                hideForm={batchModeActive && selectedKeys.has(key)}
              />
            );
          })}
        </div>
      ))}

      {batchModeActive && (
        <div className="pay-card" style={{ position: 'sticky', bottom: 14, zIndex: 5 }}>
          <div className="pay-card-head">
            <h4>💸 Avisar pagamento em lote</h4>
            <span style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--pink-deep)', fontFamily: "'Outfit',sans-serif" }}>
                Total: {fmt(selectedTotal)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{selectedEntries.length} itens selecionados</div>
            </span>
          </div>
          <div className="pay-form" style={{ marginLeft: 0 }}>
            <select value={batchMethod} onChange={(e) => setBatchMethod(e.target.value)}>
              <option value="PIX">Pix</option>
              <option value="CARTAO">Cartão de crédito</option>
            </select>
            <input type="text" placeholder="Observação (opcional)" style={{ minWidth: 160 }} value={batchNote} onChange={(e) => setBatchNote(e.target.value)} />
            <label className="btn btn-ghost" style={{ margin: 0 }}>
              {batchFile ? `📎 ${batchFile.name}` : '📎 Anexar comprovante'}
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setBatchFile(e.target.files[0] || null)} />
            </label>
            <button className="btn btn-primary" disabled={batchSubmitting} onClick={handleSubmitBatchClaim}>
              {batchSubmitting ? 'Enviando...' : `💸 Avisar que paguei (${selectedEntries.length})`}
            </button>
          </div>
        </div>
      )}

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
              onViewReceipt={setViewingReceiptClaim}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5, color: 'var(--pink-deep)' }} onClick={() => setCancelingShipId(r.id)}>
                🗑 Cancelar solicitação de envio
              </button>
            </div>
          </div>
        );
      })}

      {viewingReceiptClaim && <ReceiptModal claim={viewingReceiptClaim} onClose={() => setViewingReceiptClaim(null)} />}
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
