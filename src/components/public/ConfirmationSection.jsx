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

      {form.join_group_link && (
        <a href={form.join_group_link} target="_blank" rel="noopener noreferrer" className="btn btn-sage" style={{ width: '100%', justifyContent: 'center', marginBottom: 24 }}>
          🔗 Entrar no grupo
        </a>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={joinedGroup} onChange={(e) => setJoinedGroup(e.target.checked)} />
        <span className="checkbox-label-text">Entrei no grupo</span>
      </label>

      {error && <p className="hint" style={{ color: 'var(--pink-deep)' }}>{error}</p>}
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack} disabled={submitting}>← Voltar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Enviando...' : '✓ Enviar formulário'}</button>
      </div>
    </div>
  );
}
