import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { interBoxFreteTotal, interBoxTaxaTotal } from '../../lib/calc';
import { fmt, itemDisplayTitle } from '../../lib/format';
import ConfirmModal from '../shared/ConfirmModal';

function SectionHeader({ open, onClick, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }} onClick={onClick}>
      <span style={{ fontSize: 10, color: 'var(--pink-deep)', display: 'inline-block', transition: 'transform .15s ease', transform: `rotate(${open ? '0deg' : '-90deg'})` }}>▾</span>
      <b>{label}</b>
    </div>
  );
}

export default function InterBoxCard({ box, onOpenItemDetail }) {
  const { items, updateInterBox, deleteInterBox, addInterCategory, removeInterCategory, removeItemFromInterBox } = useApp();
  const [sections, setSections] = useState({ items: true, step1: true, step2: true });
  const [confirmingDeleteBox, setConfirmingDeleteBox] = useState(false);
  const [confirmingRemoveItem, setConfirmingRemoveItem] = useState(null);
  const [confirmingRemoveCat, setConfirmingRemoveCat] = useState(null);

  const its = useMemo(() => (box.itemIds || []).map((id) => items.find((i) => i.id === id)).filter(Boolean), [box.itemIds, items]);
  const freteTotal = interBoxFreteTotal(box);
  const taxaTotal = interBoxTaxaTotal(box);
  const grandTotal = freteTotal + taxaTotal;

  const catById = useMemo(() => {
    const m = {};
    (box.categories || []).forEach((c) => { m[c.id] = c; });
    return m;
  }, [box.categories]);

  const groups = useMemo(() => {
    const g = {};
    its.forEach((it) => {
      const catId = box.itemCategoryMap[it.id] || '';
      if (!g[catId]) g[catId] = [];
      g[catId].push(it);
    });
    return g;
  }, [its, box.itemCategoryMap]);

  const groupOrder = useMemo(() => (
    [...(box.categories || []).map((c) => c.id), ''].filter((id) => groups[id] && groups[id].length)
  ), [box.categories, groups]);

  function toggle(section) { setSections((s) => ({ ...s, [section]: !s[section] })); }

  function setItemCategory(itemId, catId) {
    updateInterBox(box.id, (b) => {
      const map = { ...(b.itemCategoryMap || {}) };
      if (catId) map[itemId] = catId; else delete map[itemId];
      return { itemCategoryMap: map };
    });
  }
  function setItemTaxa(itemId, value) {
    updateInterBox(box.id, (b) => ({ itemTaxaMap: { ...(b.itemTaxaMap || {}), [itemId]: parseFloat(String(value).replace(',', '.')) || 0 } }));
  }
  function setCatField(catId, field, value) {
    updateInterBox(box.id, (b) => ({
      categories: (b.categories || []).map((c) => (c.id === catId ? { ...c, [field]: value } : c)),
    }));
  }
  function renameBox(name) {
    updateInterBox(box.id, { name: name.trim() || box.name });
  }

  return (
    <div className="panel-summary">
      <div className="panel-summary-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>✎</span>
          <input
            type="text"
            title="Clique para renomear a caixa"
            defaultValue={box.name}
            onBlur={(e) => renameBox(e.target.value)}
            style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16.5, color: 'var(--pink-deep)', border: '1px dashed var(--pink-light)', background: '#fff', padding: '6px 10px', borderRadius: 10, minWidth: 180 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge neutral">{its.length} {its.length === 1 ? 'item' : 'itens'}</span>
          <span className="badge pago">Total: {fmt(grandTotal)}</span>
          <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 11.5 }} onClick={() => setConfirmingDeleteBox(true)}>🗑 Excluir caixa</button>
        </div>
      </div>

      <div style={{ marginBottom: sections.items ? 8 : 18 }}>
        <SectionHeader open={sections.items} onClick={() => toggle('items')} label="Itens nesta caixa" />
      </div>
      {sections.items && (
        <div className="ceg-list" style={{ marginBottom: 18 }}>
          {its.length === 0 ? (
            <div className="meta-row" style={{ color: 'var(--ink-soft)' }}>Nenhum item nesta caixa ainda — selecione itens acima.</div>
          ) : its.map((it) => {
            const currentCat = box.itemCategoryMap[it.id] || '';
            return (
              <div className="ceg-list-item" style={{ cursor: 'default' }} key={it.id}>
                <span
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--pink-light)', textUnderlineOffset: 3 }}
                  onClick={() => onOpenItemDetail(it.id)}
                >
                  {itemDisplayTitle(it)} <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>— {it.joiner}</span>
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={currentCat} style={{ fontSize: 12, padding: '6px 8px' }} onChange={(e) => setItemCategory(it.id, e.target.value)}>
                    <option value="">Sem categoria</option>
                    {(box.categories || []).map((cat) => <option key={cat.id} value={cat.id}>{cat.name || '(sem nome)'}</option>)}
                  </select>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setConfirmingRemoveItem(it)}>✕ Remover</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: sections.step1 ? 2 : 20 }}>
        <SectionHeader open={sections.step1} onClick={() => toggle('step1')} label="Etapa 1 — Frete Inter (preço por categoria)" />
      </div>
      {sections.step1 && (
        <>
          <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: '0 0 8px' }}>Defina o preço de UM item dessa categoria — o total é esse preço × quantos itens da caixa estão marcados com ela.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(box.categories || []).length === 0 ? (
              <div className="meta-row" style={{ color: 'var(--ink-soft)', marginBottom: 8 }}>Nenhuma categoria ainda.</div>
            ) : box.categories.map((cat) => {
              const count = Object.values(box.itemCategoryMap || {}).filter((c) => c === cat.id).length;
              return (
                <div className="pay-row" style={{ padding: '8px 0' }} key={cat.id}>
                  <input type="text" placeholder="Categoria (ex: Photocard)" style={{ flex: 1, minWidth: 140 }}
                    defaultValue={cat.name} onBlur={(e) => setCatField(cat.id, 'name', e.target.value.trim())} />
                  <input type="text" placeholder="Preço/item" style={{ width: 110 }}
                    defaultValue={cat.value} onBlur={(e) => setCatField(cat.id, 'value', parseFloat(String(e.target.value).replace(',', '.')) || 0)} />
                  <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', minWidth: 120 }}>
                    × {count} {count === 1 ? 'item' : 'itens'} = {fmt((Number(cat.value) || 0) * count)}
                  </span>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => setConfirmingRemoveCat(cat)}>🗑</button>
                </div>
              );
            })}
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => addInterCategory(box.id)}>+ Adicionar categoria</button>
        </>
      )}

      <div style={{ marginTop: 20, marginBottom: sections.step2 ? 2 : 0 }}>
        <SectionHeader open={sections.step2} onClick={() => toggle('step2')} label="Etapa 2 — Taxa (valor individual por item)" />
      </div>
      {sections.step2 && (
        <>
          <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: '0 0 8px' }}>Itens continuam agrupados pela categoria da Etapa 1, mas aqui cada item tem seu próprio valor de taxa — pode variar item a item.</p>
          {its.length === 0 ? (
            <div className="meta-row" style={{ color: 'var(--ink-soft)' }}>Adicione itens à caixa para lançar a taxa.</div>
          ) : groupOrder.map((catId) => {
            const groupItems = groups[catId];
            const groupLabel = catId ? (catById[catId] ? (catById[catId].name || '(sem nome)') : '(categoria removida)') : 'Sem categoria';
            return (
              <div style={{ marginBottom: 10 }} key={catId || 'none'}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--pink-deep)', marginBottom: 4 }}>{groupLabel}</div>
                {groupItems.map((it) => (
                  <div className="pay-row" style={{ padding: '6px 0' }} key={it.id}>
                    <span style={{ flex: 1, minWidth: 140, fontSize: 13 }}>{itemDisplayTitle(it)} <span style={{ color: 'var(--ink-soft)' }}>— {it.joiner}</span></span>
                    <input type="text" placeholder="0.00" style={{ width: 110 }}
                      defaultValue={box.itemTaxaMap[it.id] || 0} onBlur={(e) => setItemTaxa(it.id, e.target.value)} />
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}

      <div className="panel-summary-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="psum-box"><div className="psum-label">Frete Inter</div><div className="psum-value">{fmt(freteTotal)}</div></div>
        <div className="psum-box"><div className="psum-label">Taxa</div><div className="psum-value">{fmt(taxaTotal)}</div></div>
        <div className="psum-box"><div className="psum-label">Total da caixa</div><div className="psum-value ok">{fmt(grandTotal)}</div></div>
      </div>

      {confirmingDeleteBox && (
        <ConfirmModal
          title="Excluir caixa internacional"
          message="Os itens voltam a aparecer como &quot;sem caixa internacional&quot;. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onCancel={() => setConfirmingDeleteBox(false)}
          onConfirm={() => { deleteInterBox(box.id); setConfirmingDeleteBox(false); }}
        />
      )}
      {confirmingRemoveItem && (
        <ConfirmModal
          title="Remover item da caixa"
          message={`Tem certeza que deseja remover "${itemDisplayTitle(confirmingRemoveItem)}" desta caixa internacional? A categoria atribuída a ele também será perdida.`}
          confirmLabel="Remover"
          onCancel={() => setConfirmingRemoveItem(null)}
          onConfirm={() => { removeItemFromInterBox(box.id, confirmingRemoveItem.id); setConfirmingRemoveItem(null); }}
        />
      )}
      {confirmingRemoveCat && (
        <ConfirmModal
          title="Excluir categoria"
          message={(() => {
            const count = Object.values(box.itemCategoryMap || {}).filter((c) => c === confirmingRemoveCat.id).length;
            return `Tem certeza que deseja excluir a categoria "${confirmingRemoveCat.name || '(sem nome)'}"?${count > 0 ? ` ${count} ${count === 1 ? 'item ficará' : 'itens ficarão'} sem categoria.` : ''} Essa ação não pode ser desfeita.`;
          })()}
          confirmLabel="Excluir"
          onCancel={() => setConfirmingRemoveCat(null)}
          onConfirm={() => { removeInterCategory(box.id, confirmingRemoveCat.id); setConfirmingRemoveCat(null); }}
        />
      )}
    </div>
  );
}
