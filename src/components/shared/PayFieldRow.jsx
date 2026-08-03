import { useState } from 'react';

export default function PayFieldRow({ label, amount, isLate, existingClaim, onSubmit, onCancelClaim, onViewReceipt }) {
  const [method, setMethod] = useState('PIX');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (existingClaim) {
    return (
      <div className="pay-row">
        <div className="pay-row-label">{label}</div>
        <div className="pay-row-amount">{amount}{isLate ? <> · <span style={{ color: '#8A5A16', fontWeight: 700 }}>Atrasado</span></> : ''}</div>
        <span className="pay-waiting">🕓 Aguardando verificação</span>
        {existingClaim.hasReceipt && (
          <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => onViewReceipt(existingClaim.id)}>📎 Ver comprovante</button>
        )}
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => onCancelClaim(existingClaim.id)}>Cancelar aviso</button>
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit({ method, note, file });
    setSubmitting(false);
  }

  return (
    <div className="pay-row">
      <div className="pay-row-label">{label}</div>
      <div className="pay-row-amount">{amount}{isLate ? <> · <span style={{ color: '#8A5A16', fontWeight: 700 }}>Atrasado</span></> : ''}</div>
      <div className="pay-form">
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="PIX">Pix</option>
          <option value="CARTAO">Cartão de crédito</option>
        </select>
        <input type="text" placeholder="Observação (opcional)" style={{ minWidth: 160 }} value={note} onChange={(e) => setNote(e.target.value)} />
        <label className="btn btn-ghost" style={{ margin: 0 }}>
          {file ? `📎 ${file.name}` : '📎 Anexar comprovante'}
          <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>{submitting ? 'Enviando...' : '💸 Avisar que paguei'}</button>
      </div>
    </div>
  );
}
