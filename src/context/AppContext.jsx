import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { STORAGE_KEYS, SEED_ITEMS, SEED_ITEM_CATEGORIES, PAYMENT_FIELDS } from '../lib/constants';
import { migrateItems, migrateShippingRequests, migrateInterBoxes } from '../lib/migrations';
import { genId, genPayId, genBatchId, genShipId, genInterBoxId, genInterCatId, genRegId } from '../lib/format';
import { findRegistryConflict } from '../lib/joiners';
import { savePhoto, deletePhoto, deleteReceipt } from '../lib/storage';
import { supabase } from '../lib/supabaseClient';

// cadastro's DB columns use snake_case (nome_completo); every other layer of
// the app (RegistryModal, joiners.js, ItemModal, ...) has always worked with
// the camelCase shape below, so the mapping lives here rather than rippling
// through every consumer.
function cadastroRowToEntry(row) {
  return { id: row.id, apelido: row.apelido, nomeCompleto: row.nome_completo || '', phone: row.phone || '', social: row.social, source: row.source || null };
}
function entryToCadastroRow(entry) {
  return { id: entry.id, apelido: entry.apelido, nome_completo: entry.nomeCompleto || '', phone: entry.phone || '', social: entry.social, source: entry.source || null };
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [items, setItems] = usePersistedState(STORAGE_KEYS.items, () => SEED_ITEMS.map((it) => ({ ...it })), migrateItems);
  const [cadastroRows, registryLoaded, cadastroActions] = useSupabaseTable('cadastro');
  const registry = useMemo(() => cadastroRows.map(cadastroRowToEntry), [cadastroRows]);
  const [members, , membersActions] = useSupabaseTable('members', { orderBy: 'name' });
  const [paymentClaims, setPaymentClaims] = usePersistedState(STORAGE_KEYS.paymentClaims, []);
  const [shippingRequests, setShippingRequests] = usePersistedState(STORAGE_KEYS.shippingRequests, [], migrateShippingRequests);
  const [interBoxes, setInterBoxes] = usePersistedState(STORAGE_KEYS.interBoxes, [], migrateInterBoxes);
  const [memberRosters, setMemberRosters] = usePersistedState(STORAGE_KEYS.memberRosters, []);
  const [itemOrders, setItemOrders] = usePersistedState(STORAGE_KEYS.itemOrders, []);
  const [itemCategories, setItemCategories] = usePersistedState(STORAGE_KEYS.itemCategories, () => SEED_ITEM_CATEGORIES.map((c) => ({ ...c })));

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

  // ---------- registry (cadastro table) ----------
  // Returns { error } (see useSupabaseTable) — callers should await this and alert
  // on failure rather than assuming the write succeeded.
  function upsertRegistryEntry(entry) {
    return cadastroActions.upsertRow(entryToCadastroRow(entry));
  }
  function removeRegistryEntry(id) {
    return cadastroActions.removeRow(id);
  }

  // ---------- members (shared option source for Formulários) ----------
  function upsertMember(member) {
    return membersActions.upsertRow(member);
  }
  function removeMember(id) {
    return membersActions.removeRow(id);
  }

  // ---------- item categories ----------
  function upsertItemCategory(entry) {
    setItemCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === entry.id);
      if (idx > -1) { const copy = [...prev]; copy[idx] = entry; return copy; }
      return [...prev, entry];
    });
  }
  // Items keep whatever category code they already had — deleting it here just means it
  // no longer shows up as a pickable option going forward, not a cascade over existing items.
  function removeItemCategory(id) {
    setItemCategories((prev) => prev.filter((c) => c.id !== id));
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
    registry, registryLoaded, upsertRegistryEntry, removeRegistryEntry,
    members, upsertMember, removeMember,
    memberRosters, setMemberRosters, upsertMemberRoster, removeMemberRoster,
    itemOrders, setItemOrders, submitItemOrder, approveItemOrder, denyItemOrder,
    itemCategories, setItemCategories, upsertItemCategory, removeItemCategory,
    paymentClaims, setPaymentClaims, submitPaymentClaim, submitBatchPaymentClaim, cancelPaymentClaim, confirmPaymentClaim, confirmBatchPaymentClaim,
    shippingRequests, setShippingRequests, createShippingRequest, updateShippingRequest, cancelShippingRequest,
    interBoxes, setInterBoxes, createInterBox, updateInterBox, deleteInterBox, addInterCategory, removeInterCategory, removeItemFromInterBox,
    setItemPhoto, clearItemPhoto,
    unlocked, tryUnlock, lock,
    genId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, registry, registryLoaded, members, memberRosters, itemOrders, itemCategories, paymentClaims, shippingRequests, interBoxes, unlocked]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
