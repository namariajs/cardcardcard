import { useState } from 'react';

export default function ConfirmationSection({ form, joinedGroup, setJoinedGroup, onSubmit, onBack, submitting }) {
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!joinedGroup) { setError('Confirme que você entrou no grupo para concluir o envio.'); return; }
    setError('');
    onSubmit();
  }

  return (
    <div className="form-section">
      <h3>Quase lá!</h3>
      {form.thank_you_text && <p className="hint">{form.thank_you_text}</p>}

      {form.join_group_link && (
        <p>
          <a href={form.join_group_link} target="_blank" rel="noopener noreferrer">🔗 Entrar no grupo</a>
        </p>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={joinedGroup} onChange={(e) => setJoinedGroup(e.target.checked)} />
        <span style={{ textTransform: 'none', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>Entrei no grupo</span>
      </label>

      {error && <p className="hint" style={{ color: 'var(--pink-deep)' }}>{error}</p>}
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={submitting}>← Voltar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Enviando...' : '✓ Enviar formulário'}</button>
      </div>
    </div>
  );
}
