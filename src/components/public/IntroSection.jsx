import { useMemo, useState } from 'react';
import { formatPhoneBR, formatDateOnly, onlyDigits } from '../../lib/format';

export default function IntroSection({ form, cadastroList, identity, setIdentity, onNext }) {
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    // Apelido is intentionally not searchable — nobody should be able to find someone
    // else's cadastro by guessing a nickname. Phone is compared digit-only since it's
    // stored/displayed formatted ("(11) 97951-9527") and the query usually isn't.
    const qDigits = onlyDigits(search);
    return cadastroList
      .filter((r) => {
        const socialMatch = String(r.social || '').toLowerCase().includes(q);
        const phoneMatch = qDigits.length >= 4 && onlyDigits(r.phone).includes(qDigits);
        return socialMatch || phoneMatch;
      })
      .slice(0, 8);
  }, [search, cadastroList]);

  function pickMatch(match) {
    // Spread the existing identity (not a fresh literal) so fields set earlier in this
    // step — agreedToTerms above all — survive picking a match. A bare object literal
    // here previously dropped agreedToTerms back to undefined, silently un-checking the
    // terms checkbox from handleNext's point of view even though it still looked checked.
    setIdentity({ ...identity, mode: 'existing', cadastroId: match.id, matchedCadastro: match, apelido: '', phone: '', social: '' });
    setSearch(match.apelido);
  }

  function switchToNew() {
    setIdentity({ ...identity, mode: 'new', cadastroId: null, matchedCadastro: null, apelido: '', phone: '', social: '' });
  }

  function handleNext() {
    if (!identity.agreedToTerms) { setError('Você precisa concordar com as regras para continuar.'); return; }
    if (identity.mode === 'existing' && !identity.cadastroId) { setError('Busque e selecione seu cadastro, ou escolha "Não tenho cadastro".'); return; }
    if (identity.mode === 'new') {
      if (!identity.apelido.trim()) { setError('Informe seu apelido.'); return; }
      if (!identity.social.trim()) { setError('Informe seu @.'); return; }
    }
    setError('');
    onNext();
  }

  return (
    <div className="form-section">
      {form.cover_image_url && (
        <img src={form.cover_image_url} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 16, marginBottom: 14 }} />
      )}
      <h3>{form.title}</h3>
      {form.subtitle && <p className="hint">{form.subtitle}</p>}
      {form.deadline && <p className="hint">⏰ Prazo final: <b>{formatDateOnly(form.deadline)}</b></p>}
      {form.rules_text && <div className="public-rules">{form.rules_text}</div>}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 14 }}>
        <input type="checkbox" checked={identity.agreedToTerms} onChange={(e) => setIdentity({ ...identity, agreedToTerms: e.target.checked })} />
        <span style={{ textTransform: 'none', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>Li e concordo com as regras acima</span>
      </label>

      <h3 style={{ marginTop: 22 }}>Quem é você?</h3>
      {identity.mode === 'existing' ? (
        <>
          <div className="field full">
            <label>Buscar cadastro (@ ou telefone)</label>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setIdentity({ ...identity, cadastroId: null, matchedCadastro: null }); }} placeholder="Digite para buscar..." />
            {results.length > 0 && !identity.cadastroId && (
              <div className="autocomplete-dropdown" style={{ position: 'static', marginTop: 4 }}>
                {results.map((r) => (
                  <div key={r.id} className="autocomplete-option" onMouseDown={() => pickMatch(r)}>
                    {r.apelido} {r.social ? `— ${r.social}` : ''} {r.phone ? `— ${formatPhoneBR(r.phone)}` : ''}
                  </div>
                ))}
              </div>
            )}
            {search.trim() && results.length === 0 && !identity.cadastroId && (
              <div className="hint" style={{ marginTop: 6, marginBottom: 0 }}>Nenhum cadastro encontrado com esse @ ou telefone. Clique em "Não tenho cadastro" abaixo para se cadastrar.</div>
            )}
            {identity.cadastroId && <div className="meta-row" style={{ marginTop: 6, color: '#2F5C40' }}>✓ Selecionado: <b>{identity.matchedCadastro?.apelido}</b></div>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={switchToNew}>Não tenho cadastro</button>
        </>
      ) : (
        <>
          <div className="form-grid">
            <div className="field full"><label>Apelido</label><input value={identity.apelido} onChange={(e) => setIdentity({ ...identity, apelido: e.target.value })} /></div>
            <div className="field"><label>WhatsApp (com DDD)</label><input value={identity.phone} onChange={(e) => setIdentity({ ...identity, phone: formatPhoneBR(e.target.value) })} placeholder="(11) 91234-5678" /></div>
            <div className="field"><label>@ Rede social</label><input value={identity.social} onChange={(e) => setIdentity({ ...identity, social: e.target.value })} placeholder="@usuario" /></div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setIdentity({ ...identity, mode: 'existing', cadastroId: null, matchedCadastro: null, apelido: '', phone: '', social: '' })}>Já tenho cadastro</button>
        </>
      )}

      {error && <p className="hint" style={{ color: 'var(--pink-deep)' }}>{error}</p>}
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={handleNext}>Continuar →</button>
      </div>
    </div>
  );
}
