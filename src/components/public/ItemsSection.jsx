import { useState } from 'react';
import { fmt } from '../../lib/format';
import ReceiptModal from '../shared/ReceiptModal';

function QtyStepper({ value, onChange, min = 0 }) {
  const num = Number(value) || 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button type="button" className="qty-stepper-btn" disabled={num <= min} onClick={() => onChange(Math.max(min, num - 1))}>−</button>
      <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, fontSize: 15, fontFamily: "'Outfit',sans-serif" }}>{num}</span>
      <button type="button" className="qty-stepper-btn" onClick={() => onChange(num + 1)}>+</button>
    </div>
  );
}

export default function ItemsSection({ formItems, selections, setSelections, onNext, onBack }) {
  const [error, setError] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null); // { url, name }

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
            <div className="item-card public-item-card" key={item.id}>
              {item.photo_url ? (
                <img
                  src={item.photo_url} alt="" className="public-item-photo" style={{ cursor: 'pointer' }}
                  onClick={() => setViewingPhoto({ url: item.photo_url, name: item.name })}
                />
              ) : (
                <div className="public-item-photo-placeholder"><span>🖼️</span></div>
              )}
              <div className="item-content">
                <div className="public-item-name">{item.name}</div>
                <div className="public-item-price">{fmt(item.price)}</div>
                {item.instructions && <div className="meta-row" style={{ color: 'var(--ink-soft)' }}>{item.instructions}</div>}

                {item.selection_type === 'random' && (
                  <div className="field" style={{ marginTop: 10 }}>
                    <label>Quantidade</label>
                    <QtyStepper value={sel.quantity ?? 0} onChange={(v) => setRandomQty(item.id, v)} />
                  </div>
                )}

                {item.selection_type === 'single_choice' && (
                  <div style={{ marginTop: 8 }}>
                    {(item.form_item_options || []).map((opt) => (
                      <label key={opt.id} className="pay-row" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={(sel.selectedOptionIds || []).includes(opt.id)} onChange={() => toggleOption(item.id, opt.id)} />
                        <span className="pay-row-label" style={{ minWidth: 0 }}>{opt.members?.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {item.selection_type === 'multi_choice_qty' && (
                  <div style={{ marginTop: 8 }}>
                    {(item.form_item_options || []).map((opt) => (
                      <div key={opt.id} className="pay-row" style={{ justifyContent: 'space-between' }}>
                        <span className="pay-row-label" style={{ minWidth: 0 }}>{opt.members?.name}</span>
                        <QtyStepper value={sel.qtyByOptionId?.[opt.id] ?? 0} onChange={(v) => setOptionQty(item.id, opt.id, v)} />
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
      {viewingPhoto && <ReceiptModal imageUrl={viewingPhoto.url} title={viewingPhoto.name} onClose={() => setViewingPhoto(null)} />}
    </div>
  );
}
