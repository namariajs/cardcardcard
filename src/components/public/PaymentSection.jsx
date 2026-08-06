import { useState } from 'react';

export default function PaymentSection({ form, payment, setPayment, onNext, onBack }) {
  const [error, setError] = useState('');

  function set(field, value) { setPayment({ ...payment, [field]: value }); }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    set('receiptFile', file);
  }

  function handleNext() {
    if (!payment.method) { setError('Escolha uma forma de pagamento.'); return; }
    if (!payment.amountPaid || Number(String(payment.amountPaid).replace(',', '.')) <= 0) { setError('Informe o valor pago.'); return; }
    if (payment.method === 'pix' && !payment.receiptFile && !payment.receiptDriveLink.trim()) {
      setError('Envie o comprovante ou informe um link do Google Drive.');
      return;
    }
    setError('');
    onNext();
  }

  return (
    <div className="form-section">
      <h3>Pagamento</h3>
      {form.pix_key && <p className="hint">Chave Pix: <b className="mono">{form.pix_key}</b></p>}

      <div className="field full">
        <label>Forma de pagamento</label>
        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textTransform: 'none', fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>
            <input type="radio" name="payment_method" checked={payment.method === 'pix'} onChange={() => set('method', 'pix')} /> Pix
          </label>
          {form.allow_card_payment && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textTransform: 'none', fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>
              <input type="radio" name="payment_method" checked={payment.method === 'cartao'} onChange={() => set('method', 'cartao')} /> Cartão de Crédito
            </label>
          )}
        </div>
      </div>

      {payment.method === 'cartao' && form.card_contact_text && (
        <div className="lock-note">{form.card_contact_text}</div>
      )}

      <div className="field">
        <label>Valor pago (R$)</label>
        <input value={payment.amountPaid} onChange={(e) => set('amountPaid', e.target.value)} />
      </div>

      {payment.method === 'pix' && (
        <>
          <div className="field full">
            <label>Comprovante (imagem ou PDF)</label>
            <div className="photo-upload-row">
              <div className="photo-preview">{payment.receiptFile ? <span>📎</span> : <span>🖼️</span>}</div>
              <div className="photo-upload-actions">
                <input type="file" id="receiptInput" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                <button type="button" className="btn btn-ghost" onClick={() => document.getElementById('receiptInput').click()}>📎 Escolher arquivo</button>
                {payment.receiptFile && <span className="hint" style={{ margin: 0 }}>{payment.receiptFile.name}</span>}
              </div>
            </div>
          </div>
          <div className="field full">
            <label>Ou link do Google Drive</label>
            <input value={payment.receiptDriveLink} onChange={(e) => set('receiptDriveLink', e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
        </>
      )}

      <div className="field full">
        <label>Comentários (opcional)</label>
        <textarea rows={3} value={payment.comments} onChange={(e) => set('comments', e.target.value)} />
      </div>

      {error && <p className="hint" style={{ color: 'var(--pink-deep)' }}>{error}</p>}
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack}>← Voltar</button>
        <button className="btn btn-primary" onClick={handleNext}>Continuar →</button>
      </div>
    </div>
  );
}
