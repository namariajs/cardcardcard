import { createContext, useContext, useMemo, useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { STORAGE_KEYS, GOM_PIN, SEED_ITEMS, PAYMENT_FIELDS } from '../lib/constants';
import { migrateItems, migrateShippingRequests, migrateInterBoxes } from '../lib/migrations';
import { genId, genPayId, genShipId, genInterBoxId, genInterCatId } from '../lib/format';
import { savePhoto, deletePhoto, deleteReceipt } from '../lib/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [items, setItems] = usePersistedState(STORAGE_KEYS.items, () => SEED_ITEMS.map((it) => ({ ...it })), migrateItems);
  const [registry, setRegistry] = usePersistedState(STORAGE_KEYS.registry, []);
  const [paymentClaims, setPaymentClaims] = usePersistedState(STORAGE_KEYS.paymentClaims, []);
  const [shippingRequests, setShippingRequests] = usePersistedState(STORAGE_KEYS.shippingRequests, [], migrateShippingRequests);
  const [interBoxes, setInterBoxes] = usePersistedState(STORAGE_KEYS.interBoxes, [], migrateInterBoxes);

  const [unlocked, setUnlocked] = useState(false);

  // ---------- items ----------
  function upsertItem(item) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx > -1) { const copy = [...prev]; copy[idx] = item; return copy; }
      return [...prev, item];
    });
  }
  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // ---------- registry ----------
  function upsertRegistryEntry(entry) {
    setRegistry((prev) => {
      const idx = prev.findIndex((r) => r.id === entry.id);
      if (idx > -1) { const copy = [...prev]; copy[idx] = entry; return copy; }
      return [...prev, entry];
    });
  }
  function removeRegistryEntry(id) {
    setRegistry((prev) => prev.filter((r) => r.id !== id));
  }

  // ---------- payment claims ----------
  function submitPaymentClaim({ id, itemId, fieldKey, joiner, method, note, hasReceipt }) {
    const claim = {
      id: id || genPayId(), itemId, fieldKey, joiner, method, note,
      submittedAt: new Date().toISOString(), status: 'PENDENTE_VERIFICACAO', hasReceipt: !!hasReceipt,
    };
    setPaymentClaims((prev) => [...prev, claim]);
    return claim;
  }
  function cancelPaymentClaim(claimId) {
    const claim = paymentClaims.find((c) => c.id === claimId);
    setPaymentClaims((prev) => prev.filter((c) => c.id !== claimId));
    if (claim?.hasReceipt) deleteReceipt(claimId);
  }
  function confirmPaymentClaim(claimId) {
    const claim = paymentClaims.find((c) => c.id === claimId);
    if (!claim) return;
    if (claim.fieldKey === 'envioNacional') {
      setShippingRequests((prev) => prev.map((r) => (r.id === claim.itemId ? { ...r, pagFrete: 'PAGO' } : r)));
    } else {
      const fieldDef = PAYMENT_FIELDS.find((f) => f.key === claim.fieldKey);
      if (fieldDef) {
        setItems((prev) => prev.map((it) => (it.id === claim.itemId ? { ...it, [fieldDef.pagField]: 'PAGO' } : it)));
      }
    }
    setPaymentClaims((prev) => prev.map((c) => (c.id === claimId ? { ...c, status: 'CONFIRMADO', confirmedAt: new Date().toISOString() } : c)));
  }

  // ---------- shipping requests (Frete Nacional) ----------
  function createShippingRequest(data) {
    const req = { id: genShipId(), submittedAt: new Date().toISOString(), status: 'PENDENTE', freteTotal: null, pagFrete: null, rastreio: null, rastreioAt: null, reminderSnoozedUntil: null, ...data };
    setShippingRequests((prev) => [...prev, req]);
    return req;
  }
  function updateShippingRequest(id, patch) {
    setShippingRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)));
  }
  function cancelShippingRequest(id) {
    const claim = paymentClaims.find((c) => c.itemId === id && c.fieldKey === 'envioNacional' && c.status === 'PENDENTE_VERIFICACAO');
    setShippingRequests((prev) => prev.filter((r) => r.id !== id));
    setPaymentClaims((prev) => prev.filter((c) => !(c.itemId === id && c.fieldKey === 'envioNacional')));
    if (claim?.hasReceipt) deleteReceipt(claim.id);
  }

  // ---------- inter boxes ----------
  function createInterBox(itemIds) {
    const box = { id: genInterBoxId(), name: `Caixa Inter ${interBoxes.length + 1}`, itemIds, categories: [], itemCategoryMap: {}, itemTaxaMap: {}, createdAt: new Date().toISOString() };
    setInterBoxes((prev) => [...prev, box]);
    return box;
  }
  function updateInterBox(id, patch) {
    setInterBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...(typeof patch === 'function' ? patch(b) : patch) } : b)));
  }
  function deleteInterBox(id) {
    setInterBoxes((prev) => prev.filter((b) => b.id !== id));
  }
  function addInterCategory(boxId) {
    updateInterBox(boxId, (b) => ({ categories: [...(b.categories || []), { id: genInterCatId(), name: '', value: 0 }] }));
  }
  function removeInterCategory(boxId, catId) {
    updateInterBox(boxId, (b) => {
      const map = { ...(b.itemCategoryMap || {}) };
      Object.keys(map).forEach((itemId) => { if (map[itemId] === catId) delete map[itemId]; });
      return { categories: (b.categories || []).filter((c) => c.id !== catId), itemCategoryMap: map };
    });
  }
  function removeItemFromInterBox(boxId, itemId) {
    updateInterBox(boxId, (b) => {
      const catMap = { ...(b.itemCategoryMap || {}) }; delete catMap[itemId];
      const taxaMap = { ...(b.itemTaxaMap || {}) }; delete taxaMap[itemId];
      return { itemIds: (b.itemIds || []).filter((id) => id !== itemId), itemCategoryMap: catMap, itemTaxaMap: taxaMap };
    });
  }

  // ---------- photos ----------
  async function setItemPhoto(id, dataUrl) {
    await savePhoto(id, dataUrl);
  }
  async function clearItemPhoto(id) {
    await deletePhoto(id);
  }

  function tryUnlock(pin) {
    if (pin === GOM_PIN) { setUnlocked(true); return true; }
    return false;
  }
  function lock() { setUnlocked(false); }

  const value = useMemo(() => ({
    items, setItems, upsertItem, removeItem,
    registry, setRegistry, upsertRegistryEntry, removeRegistryEntry,
    paymentClaims, setPaymentClaims, submitPaymentClaim, cancelPaymentClaim, confirmPaymentClaim,
    shippingRequests, setShippingRequests, createShippingRequest, updateShippingRequest, cancelShippingRequest,
    interBoxes, setInterBoxes, createInterBox, updateInterBox, deleteInterBox, addInterCategory, removeInterCategory, removeItemFromInterBox,
    setItemPhoto, clearItemPhoto,
    unlocked, tryUnlock, lock,
    genId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, registry, paymentClaims, shippingRequests, interBoxes, unlocked]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
