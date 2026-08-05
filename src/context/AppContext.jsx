import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { STORAGE_KEYS, SEED_ITEMS, PAYMENT_FIELDS } from '../lib/constants';
import { migrateItems, migrateShippingRequests, migrateInterBoxes } from '../lib/migrations';
import { genId, genPayId, genBatchId, genShipId, genInterBoxId, genInterCatId, genRegId } from '../lib/format';
import { findRegistryConflict } from '../lib/joiners';
import { savePhoto, deletePhoto, deleteReceipt } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [items, setItems] = usePersistedState(STORAGE_KEYS.items, () => SEED_ITEMS.map((it) => ({ ...it })), migrateItems);
  const [registry, setRegistry, registryLoaded] = usePersistedState(STORAGE_KEYS.registry, []);
  const [paymentClaims, setPaymentClaims] = usePersistedState(STORAGE_KEYS.paymentClaims, []);
  const [shippingRequests, setShippingRequests] = usePersistedState(STORAGE_KEYS.shippingRequests, [], migrateShippingRequests);
  const [interBoxes, setInterBoxes] = usePersistedState(STORAGE_KEYS.interBoxes, [], migrateInterBoxes);
  const [memberRosters, setMemberRosters] = usePersistedState(STORAGE_KEYS.memberRosters, []);
  const [itemOrders, setItemOrders] = usePersistedState(STORAGE_KEYS.itemOrders, []);

  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUnlocked(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUnlocked(!!session);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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

  // ---------- member rosters ----------
  function upsertMemberRoster(roster) {
    setMemberRosters((prev) => {
      const idx = prev.findIndex((r) => r.id === roster.id);
      if (idx > -1) { const copy = [...prev]; copy[idx] = roster; return copy; }
      return [...prev, roster];
    });
  }
  function removeMemberRoster(id) {
    setMemberRosters((prev) => prev.filter((r) => r.id !== id));
  }

  // ---------- item orders (joiners requesting an unclaimed item) ----------
  function submitItemOrder(order) {
    setItemOrders((prev) => [...prev, order]);
  }
  // Approving turns pendingCadastro into a real Cadastro entry only now (running the same
  // duplicate check RegistryModal uses, so a match added after the request was submitted
  // attaches to that entry instead of creating a second one), then claims the item.
  function approveItemOrder(orderId) {
    const order = itemOrders.find((o) => o.id === orderId);
    if (!order || order.status !== 'PENDENTE') return;
    const item = items.find((i) => i.id === order.itemId);
    // Item already claimed (e.g. another order for it got approved first) or deleted —
    // this request can no longer be fulfilled, so it's denied rather than silently vanishing.
    if (!item || !item.unclaimed) { setItemOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'NEGADO' } : o))); return; }

    let resolvedHandle = order.resolvedJoiner || null;
    if (!resolvedHandle && order.pendingCadastro) {
      const pc = order.pendingCadastro;
      const conflict = findRegistryConflict(registry, pc);
      if (conflict) {
        resolvedHandle = conflict.social;
      } else {
        resolvedHandle = pc.social;
        upsertRegistryEntry({ id: genRegId(), apelido: pc.apelido, nomeCompleto: pc.nomeCompleto || '', phone: pc.phone || '', social: pc.social });
      }
    }
    if (resolvedHandle) {
      setItems((prev) => prev.map((it) => (it.id === order.itemId ? { ...it, joiner: resolvedHandle, unclaimed: false } : it)));
    }
    setItemOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'APROVADO', resolvedJoiner: resolvedHandle } : o)));
  }
  function denyItemOrder(orderId) {
    setItemOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'NEGADO' } : o)));
  }

  // ---------- payment claims ----------
  function submitPaymentClaim({ id, itemId, fieldKey, joiner, method, note, hasReceipt }) {
    const claim = {
      id: id || genPayId(), itemId, fieldKey, joiner, method, note,
      submittedAt: new Date().toISOString(), status: 'PENDENTE_VERIFICACAO', hasReceipt: !!hasReceipt,
      batchId: null,
    };
    setPaymentClaims((prev) => [...prev, claim]);
    return claim;
  }
  // One batchId shared across one claim per {itemId, fieldKey} pair, so a joiner can pay
  // several fields at once with a single receipt/method/note while GOM still confirms
  // (or the item-status logic still updates) one field at a time under the hood.
  function submitBatchPaymentClaim({ batchId, entries, joiner, method, note, hasReceipt }) {
    const id = batchId || genBatchId();
    const submittedAt = new Date().toISOString();
    const claims = entries.map(({ itemId, fieldKey }) => ({
      id: genPayId(), itemId, fieldKey, joiner, method, note,
      submittedAt, status: 'PENDENTE_VERIFICACAO', hasReceipt: !!hasReceipt, batchId: id,
    }));
    setPaymentClaims((prev) => [...prev, ...claims]);
    return { batchId: id, claims };
  }
  function cancelPaymentClaim(claimId) {
    const claim = paymentClaims.find((c) => c.id === claimId);
    const remaining = paymentClaims.filter((c) => c.id !== claimId);
    setPaymentClaims(remaining);
    if (claim?.hasReceipt) {
      const receiptKey = claim.batchId || claim.id;
      const stillReferenced = remaining.some((c) => (c.batchId || c.id) === receiptKey);
      if (!stillReferenced) deleteReceipt(receiptKey);
    }
  }
  function applyConfirmedClaims(claimsToApply) {
    claimsToApply.forEach((claim) => {
      if (claim.fieldKey === 'envioNacional') {
        setShippingRequests((prev) => prev.map((r) => (r.id === claim.itemId ? { ...r, pagFrete: 'PAGO' } : r)));
      } else {
        const fieldDef = PAYMENT_FIELDS.find((f) => f.key === claim.fieldKey);
        if (fieldDef) {
          const paidAt = new Date().toISOString();
          setItems((prev) => prev.map((it) => (it.id === claim.itemId ? { ...it, [fieldDef.pagField]: 'PAGO', [fieldDef.paidAtField]: paidAt } : it)));
        }
      }
    });
  }
  function confirmPaymentClaim(claimId) {
    const claim = paymentClaims.find((c) => c.id === claimId);
    if (!claim) return;
    applyConfirmedClaims([claim]);
    setPaymentClaims((prev) => prev.map((c) => (c.id === claimId ? { ...c, status: 'CONFIRMADO', confirmedAt: new Date().toISOString() } : c)));
  }
  function confirmBatchPaymentClaim(batchId) {
    const claimsInBatch = paymentClaims.filter((c) => c.batchId === batchId && c.status === 'PENDENTE_VERIFICACAO');
    if (claimsInBatch.length === 0) return;
    applyConfirmedClaims(claimsInBatch);
    const confirmedAt = new Date().toISOString();
    setPaymentClaims((prev) => prev.map((c) => (c.batchId === batchId ? { ...c, status: 'CONFIRMADO', confirmedAt } : c)));
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
    const box = interBoxes.find((b) => b.id === id);
    const itemIds = box?.itemIds || [];
    if (itemIds.length) {
      setItems((prev) => prev.map((it) => {
        if (!itemIds.includes(it.id)) return it;
        let statusCeg = it.statusCeg;
        if (statusCeg === 'CAMINHO_BRASIL') statusCeg = 'NA_WAREHOUSE';
        else if (statusCeg === 'TAXADA_RF') statusCeg = 'CAMINHO_BRASIL';
        return { ...it, valorFreteInter: 0, valorTaxa: 0, statusCeg };
      }));
    }
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

  async function tryUnlock(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }
  function lock() { supabase.auth.signOut(); }

  const value = useMemo(() => ({
    items, setItems, upsertItem, removeItem,
    registry, setRegistry, registryLoaded, upsertRegistryEntry, removeRegistryEntry,
    memberRosters, setMemberRosters, upsertMemberRoster, removeMemberRoster,
    itemOrders, setItemOrders, submitItemOrder, approveItemOrder, denyItemOrder,
    paymentClaims, setPaymentClaims, submitPaymentClaim, submitBatchPaymentClaim, cancelPaymentClaim, confirmPaymentClaim, confirmBatchPaymentClaim,
    shippingRequests, setShippingRequests, createShippingRequest, updateShippingRequest, cancelShippingRequest,
    interBoxes, setInterBoxes, createInterBox, updateInterBox, deleteInterBox, addInterCategory, removeInterCategory, removeItemFromInterBox,
    setItemPhoto, clearItemPhoto,
    unlocked, tryUnlock, lock,
    genId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, registry, registryLoaded, memberRosters, itemOrders, paymentClaims, shippingRequests, interBoxes, unlocked]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
