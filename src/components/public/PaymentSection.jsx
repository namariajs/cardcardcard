import { useState } from 'react';
import { fmt } from '../../lib/format';

export default function PaymentSection({ form, payment, setPayment, total, onNext, onBack }) {
  const [error, setError] = useState('');

  function set(field, value) { setPayment({ ...payment, [field]: value }); }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    set('receiptFile', file);
  }

  function handleNext() {
    if (!payment.method) { setError('Escolha uma forma de pagamento.'); return; }
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
      {form.pix_key && (
        <div className="lock-note">
          <span>Chave Pix: <b className="mono" style={{ fontSize: 16 }}>{form.pix_key}</b></span>
        </div>
      )}

      <div className="lock-note unlocked">
        <span>Total a pagar: <b style={{ fontSize: 16 }}>{fmt(total)}</b></span>
      </div>

      <div className="field full">
        <label>Forma de pagamento</label>
        <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <input type="radio" name="payment_method" checked={payment.method === 'pix'} onChange={() => set('method', 'pix')} />
            <span className="checkbox-label-text">Pix</span>
          </label>
          {form.allow_card_payment && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <input type="radio" name="payment_method" checked={payment.method === 'cartao'} onChange={() => set('method', 'cartao')} />
              <span className="checkbox-label-text">Cartão de Crédito</span>
            </label>
          )}
        </div>
      </div>

      {payment.method === 'cartao' && form.card_contact_text && (
        <div className="lock-note">{form.card_contact_text}</div>
      )}

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
