import { useState } from 'react';
import { fmt } from '../../lib/format';

export default function ItemsSection({ formItems, selections, setSelections, onNext, onBack }) {
  const [error, setError] = useState('');

  function setRandomQty(itemId, qty) {
    setSelections((prev) => ({ ...prev, [itemId]: { quantity: qty } }));
  }
  function toggleOption(itemId, optionId) {
    setSelections((prev) => {
      const current = prev[itemId]?.selectedOptionIds || [];
      const has = current.includes(optionId);
      return { ...prev, [itemId]: { selectedOptionIds: has ? current.filter((id) => id !== optionId) : [...current, optionId] } };
    });
  }
  function setOptionQty(itemId, optionId, qty) {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { qtyByOptionId: { ...(prev[itemId]?.qtyByOptionId || {}), [optionId]: qty } },
    }));
  }

  function hasAnySelection() {
    return formItems.some((item) => {
      const sel = selections[item.id];
      if (!sel) return false;
      if (item.selection_type === 'random') return (Number(sel.quantity) || 0) > 0;
      if (item.selection_type === 'single_choice') return (sel.selectedOptionIds || []).length > 0;
      return Object.values(sel.qtyByOptionId || {}).some((q) => (Number(q) || 0) > 0);
    });
  }

  function handleNext() {
    if (!hasAnySelection()) { setError('Selecione ao menos um item.'); return; }
    setError('');
    onNext();
  }

  return (
    <div className="form-section">
      <h3>Itens disponíveis</h3>
      <div className="grid">
        {formItems.map((item) => {
          const sel = selections[item.id] || {};
          return (
            <div className="item-card" key={item.id}>
              {item.photo_url ? (
                <img src={item.photo_url} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 10, marginBottom: 8 }} />
              ) : (
                <div className="photo-preview" style={{ width: '100%', height: 130 }}><span>🖼️</span></div>
              )}
              <div className="item-content">
                <div className="item-name">{item.name}</div>
                <div className="meta-row"><b>{fmt(item.price)}</b></div>
                {item.instructions && <div className="meta-row" style={{ color: 'var(--ink-soft)' }}>{item.instructions}</div>}

                {item.selection_type === 'random' && (
                  <div className="field">
                    <label>Quantidade</label>
                    <input type="number" min="0" value={sel.quantity ?? ''} onChange={(e) => setRandomQty(item.id, e.target.value)} />
                  </div>
                )}

                {item.selection_type === 'single_choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {(item.form_item_options || []).map((opt) => (
                      <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={(sel.selectedOptionIds || []).includes(opt.id)} onChange={() => toggleOption(item.id, opt.id)} />
                        <span style={{ textTransform: 'none', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{opt.members?.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {item.selection_type === 'multi_choice_qty' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {(item.form_item_options || []).map((opt) => (
                      <div key={opt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13.5 }}>{opt.members?.name}</span>
                        <input type="number" min="0" style={{ width: 70 }}
                          value={sel.qtyByOptionId?.[opt.id] ?? ''}
                          onChange={(e) => setOptionQty(item.id, opt.id, e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="hint" style={{ color: 'var(--pink-deep)' }}>{error}</p>}
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack}>← Voltar</button>
        <button className="btn btn-primary" onClick={handleNext}>Continuar →</button>
      </div>
    </div>
  );
}
