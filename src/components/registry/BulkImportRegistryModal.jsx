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
  const [result, setResult] = useState(null);

  function handleImport() {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    let imported = 0;
    const skippedLines = [];
    lines.forEach((line) => {
      const parsed = parseLine(line);
      if (!parsed) { skippedLines.push(line); return; }
      upsertRegistryEntry({ id: genRegId(), apelido: parsed.apelido, nomeCompleto: '', phone: '', social: parsed.social });
      imported++;
    });
    setResult({ imported, skippedLines });
  }

  const summary = result && (
    result.skippedLines.length === 0
      ? `${result.imported} ${result.imported === 1 ? 'joiner importado' : 'joiners importados'}.`
      : `${result.imported} ${result.imported === 1 ? 'joiner importado' : 'joiners importados'}, ${result.skippedLines.length} ${result.skippedLines.length === 1 ? 'linha ignorada' : 'linhas ignoradas'}.`
  );

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
            disabled={!!result}
          />
        </div>
      </div>
      {result && (
        <div className="lock-note" style={{ marginTop: 4, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span>{summary}</span>
          {result.skippedLines.length > 0 && (
            <div style={{ fontSize: 11.5 }}>
              Linhas ignoradas (faltando apelido ou @ válido):
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {result.skippedLines.map((line, i) => <li key={i} className="mono">{line}</li>)}
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
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={!text.trim()}>Importar</button>
          </>
        )}
      </div>
    </Modal>
  );
}
