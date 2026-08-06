import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { genRegId, normHandle } from '../../lib/format';
import Modal from '../shared/Modal';

function parseLine(line) {
  const idx = line.indexOf(',');
  if (idx === -1) return null;
  const apelido = line.slice(0, idx).trim();
  const social = normHandle(line.slice(idx + 1).trim());
  if (!apelido || social.length < 2) return null;
  return { apelido, social };
}

export default function BulkImportRegistryModal({ onClose }) {
  const { upsertRegistryEntry } = useApp();
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    let imported = 0;
    const skippedLines = [];
    const failedLines = [];
    setImporting(true);
    // Sequential, not Promise.all — each write goes through the same optimistic
    // local-state update, so awaiting one at a time avoids racing overlapping updates.
    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed) { skippedLines.push(line); continue; }
      const { error } = await upsertRegistryEntry({ id: genRegId(), apelido: parsed.apelido, nomeCompleto: '', phone: '', social: parsed.social });
      if (error) failedLines.push(line);
      else imported++;
    }
    setImporting(false);
    setResult({ imported, skippedLines, failedLines });
  }

  const summaryParts = result && [
    `${result.imported} ${result.imported === 1 ? 'joiner importado' : 'joiners importados'}`,
    result.skippedLines.length > 0 ? `${result.skippedLines.length} ${result.skippedLines.length === 1 ? 'linha ignorada' : 'linhas ignoradas'}` : null,
    result.failedLines.length > 0 ? `${result.failedLines.length} ${result.failedLines.length === 1 ? 'linha falhou ao salvar' : 'linhas falharam ao salvar'}` : null,
  ].filter(Boolean).join(', ') + '.';

  return (
    <Modal onClose={onClose}>
      <h3>📋 Importar em lote</h3>
      <p className="hint">Um joiner por linha, no formato <span className="mono">Apelido, @social</span>. Telefone e nome completo ficam em branco — edite depois se precisar.</p>
      <div className="form-grid">
        <div className="field full">
          <label>Joiners</label>
          <textarea
            rows={10}
            placeholder={'Han, @hanjirxse\nJinret, @nekkomimo'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!result || importing}
          />
        </div>
      </div>
      {result && (
        <div className="lock-note" style={{ marginTop: 4, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span>{summaryParts}</span>
          {result.skippedLines.length > 0 && (
            <div style={{ fontSize: 11.5 }}>
              Linhas ignoradas (faltando apelido ou @ válido):
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {result.skippedLines.map((line, i) => <li key={i} className="mono">{line}</li>)}
              </ul>
            </div>
          )}
          {result.failedLines.length > 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--pink-deep)' }}>
              Falharam ao salvar (erro de conexão/gravação — tente importar essas linhas novamente):
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {result.failedLines.map((line, i) => <li key={i} className="mono">{line}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="modal-actions">
        {result ? (
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={onClose} disabled={importing}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={!text.trim() || importing}>{importing ? 'Importando...' : 'Importar'}</button>
          </>
        )}
      </div>
    </Modal>
  );
}
