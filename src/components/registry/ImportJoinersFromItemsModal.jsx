import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { genRegId } from '../../lib/format';
import Modal from '../shared/Modal';
import EmptyState from '../shared/EmptyState';

export default function ImportJoinersFromItemsModal({ onClose }) {
  const { items, registry, upsertRegistryEntry } = useApp();

  // Same distinct-handle logic as the "Joiners c/ Itens" stat (computeStats.joinerCount)
  // — every @ that has actually claimed something, whether or not they were ever
  // formally registered.
  const handles = useMemo(
    () => [...new Set(items.filter((it) => !it.unclaimed).map((it) => it.joiner))].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [items]
  );
  const registeredSocials = useMemo(() => new Set(registry.map((r) => String(r.social || '').toLowerCase())), [registry]);
  const rows = useMemo(
    () => handles.map((handle) => ({ handle, alreadyRegistered: registeredSocials.has(handle.toLowerCase()) })),
    [handles, registeredSocials]
  );
  const missingHandles = useMemo(() => rows.filter((r) => !r.alreadyRegistered).map((r) => r.handle), [rows]);

  const [checked, setChecked] = useState(() => new Set(missingHandles));
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  function toggle(handle) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  async function handleImport() {
    const toImport = missingHandles.filter((h) => checked.has(h));
    if (toImport.length === 0) return;
    setImporting(true);
    let imported = 0;
    const failed = [];
    for (const handle of toImport) {
      // Handle stands in for both fields — there's no real nickname to import, and
      // fabricating a phone number would be worse than leaving it blank.
      const { error } = await upsertRegistryEntry({
        id: genRegId(), apelido: handle, nomeCompleto: '', phone: '', social: handle, source: 'import_items',
      });
      // Keep the real Supabase error text, not just a generic "failed" flag — a
      // blanket 100%-failure with no visible cause (e.g. a migration that hasn't
      // been run yet, adding a column this insert now sends) is exactly what's
      // impossible to self-diagnose without this.
      if (error) failed.push({ handle, message: error.message || String(error) });
      else imported++;
    }
    setImporting(false);
    setResult({ imported, failed });
  }

  if (result) {
    return (
      <Modal onClose={onClose} maxWidth={480}>
        <h3>📥 Importar joiners dos itens</h3>
        <div className="modal-success-msg">
          {result.imported} {result.imported === 1 ? 'joiner importado' : 'joiners importados'} para o Cadastro.
        </div>
        {result.failed.length > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--pink-deep)' }}>
            Falharam ao salvar:
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {result.failed.map((f, i) => <li key={i}><span className="mono">{f.handle}</span> — {f.message}</li>)}
            </ul>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </Modal>
    );
  }

  if (missingHandles.length === 0) {
    return (
      <Modal onClose={onClose} maxWidth={480}>
        <h3>📥 Importar joiners dos itens</h3>
        <EmptyState title="Nada para importar">
          {handles.length === 0
            ? 'Nenhum item reivindicado tem um joiner ainda.'
            : 'Todos os @ encontrados nos itens já estão no Cadastro.'}
        </EmptyState>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <h3>📥 Importar joiners dos itens</h3>
      <p className="hint">
        Esses @ apareceram como joiner em algum item mas nunca foram formalmente cadastrados. Apelido e @ serão preenchidos com o próprio handle — WhatsApp fica em branco (edite depois se quiser). Desmarque quem não quiser importar.
      </p>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {rows.map((r) => (
          <label
            key={r.handle}
            className="claim-row"
            style={{ cursor: r.alreadyRegistered ? 'default' : 'pointer', opacity: r.alreadyRegistered ? 0.55 : 1 }}
          >
            <span className="mono">{r.handle}</span>
            {r.alreadyRegistered ? (
              <span className="badge pago">✓ já cadastrado</span>
            ) : (
              <input type="checkbox" checked={checked.has(r.handle)} onChange={() => toggle(r.handle)} />
            )}
          </label>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose} disabled={importing}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleImport} disabled={importing || checked.size === 0}>
          {importing ? 'Importando...' : `Importar ${checked.size} ${checked.size === 1 ? 'joiner' : 'joiners'}`}
        </button>
      </div>
    </Modal>
  );
}
