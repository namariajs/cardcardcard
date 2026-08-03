import { cegStageIndex, REMINDER_DAYS } from './constants';
import { daysSince } from './format';

// Some payment fields only make sense once an item's CEG status has reached a certain
// stage (e.g. Taxa only applies once the item has actually been taxed by the Receita
// Federal), and Frete Inter/Taxa only apply to international CEGs in the first place.
export function paymentFieldVisibleForStage(fieldKey, statusCeg, tipo) {
  if ((fieldKey === 'freteInter' || fieldKey === 'taxa') && (tipo || 'CEG_INTER') !== 'CEG_INTER') return false;
  const idx = cegStageIndex(statusCeg);
  if (fieldKey === 'freteInter') return idx >= cegStageIndex('CAMINHO_BRASIL');
  if (fieldKey === 'taxa') return idx >= cegStageIndex('TAXADA_RF');
  return true;
}

export function claimFor(paymentClaims, itemId, fieldKey) {
  return paymentClaims.find((c) => c.itemId === itemId && c.fieldKey === fieldKey && c.status === 'PENDENTE_VERIFICACAO') || null;
}


export function computeStats(items) {
  const total = items.length;
  let pendingValue = 0, confirmedValue = 0, lateValue = 0, lateCount = 0;
  items.forEach((it) => {
    [['valorItem', 'pagItem'], ['valorFreteInter', 'pagFreteInter'], ['valorTaxa', 'pagTaxa'], ['valorFreteNacional', 'pagFreteNacional']].forEach(([v, p]) => {
      if (it[p] === 'PENDENTE') pendingValue += Number(it[v]) || 0;
      else if (it[p] === 'PAGO') confirmedValue += Number(it[v]) || 0;
      else if (it[p] === 'ATRASADO') { lateValue += Number(it[v]) || 0; lateCount++; }
    });
  });
  const joinerCount = new Set(items.map((i) => i.joiner)).size;
  const cegCount = new Set(items.map((i) => i.ceg).filter((c) => c && c.trim())).size;
  return { total, pendingValue, confirmedValue, lateValue, lateCount, joinerCount, cegCount };
}

export function computePanelStats(list, joinerHandle, shippingRequests) {
  let pendingValue = 0, paidValue = 0, lateValue = 0, lateCount = 0;
  let freteInterPending = 0, taxaPending = 0, freteNacPending = 0, releasedForShipping = 0, shipped = 0, delivered = 0;
  list.forEach((it) => {
    [['valorItem', 'pagItem'], ['valorFreteInter', 'pagFreteInter'], ['valorTaxa', 'pagTaxa']].forEach(([v, p]) => {
      if (it[p] === 'PENDENTE') pendingValue += Number(it[v]) || 0;
      else if (it[p] === 'PAGO') paidValue += Number(it[v]) || 0;
      else if (it[p] === 'ATRASADO') { lateValue += Number(it[v]) || 0; lateCount++; }
    });
    if (it.pagFreteInter === 'PENDENTE' || it.pagFreteInter === 'ATRASADO') freteInterPending += Number(it.valorFreteInter) || 0;
    if (it.pagTaxa === 'PENDENTE' || it.pagTaxa === 'ATRASADO') taxaPending += Number(it.valorTaxa) || 0;
    if (it.statusCeg === 'CHEGOU_GOM') releasedForShipping++;
    if (it.statusEnvio === 'ENVIADO') shipped++;
    if (it.statusEnvio === 'ENTREGUE') delivered++;
  });
  if (joinerHandle) {
    shippingRequests
      .filter((r) => r.joiner.toLowerCase() === joinerHandle.toLowerCase() && r.status === 'PROCESSADO')
      .forEach((r) => {
        const amt = Number(r.freteTotal) || 0;
        if (r.pagFrete === 'PAGO') paidValue += amt;
        else { pendingValue += amt; freteNacPending += amt; }
      });
  }
  return { total: list.length, pendingValue, paidValue, lateValue, lateCount, freteInterPending, taxaPending, freteNacPending, releasedForShipping, shipped, delivered };
}

export function itemMatchesPanelStatusFilter(it, filter, joinerHandle, shippingRequests) {
  if (!filter) return true;
  if (filter === 'atrasado') {
    return it.pagItem === 'ATRASADO' || it.pagFreteInter === 'ATRASADO' || it.pagTaxa === 'ATRASADO';
  }
  if (filter === 'freteInter') {
    return it.pagFreteInter === 'PENDENTE' || it.pagFreteInter === 'ATRASADO';
  }
  if (filter === 'taxa') {
    return it.pagTaxa === 'PENDENTE' || it.pagTaxa === 'ATRASADO';
  }
  if (filter === 'freteNac') {
    const req = shippingRequests.find((r) => Array.isArray(r.itemIds) && r.itemIds.includes(it.id));
    return !!(req && req.joiner.toLowerCase() === String(joinerHandle || '').toLowerCase() && req.status === 'PROCESSADO' && req.pagFrete !== 'PAGO');
  }
  return true;
}

export const PANEL_STATUS_FILTER_LABELS = {
  atrasado: 'Atrasado', freteInter: 'Inter Pendente', taxa: 'Taxa Pendente', freteNac: 'Nacional Pendente',
};

export function eligibleForShipping(it) {
  return cegStageIndex(it.statusCeg) >= cegStageIndex('CHEGOU_GOM')
    && it.statusEnvio !== 'ENVIADO' && it.statusEnvio !== 'ENTREGUE';
}

export function shippingRequestFor(shippingRequests, itemId) {
  return shippingRequests.find((r) => Array.isArray(r.itemIds) && r.itemIds.includes(itemId)) || null;
}

export function pendingShippingRequests(shippingRequests) {
  return shippingRequests.filter((r) => r.status === 'PENDENTE');
}

export function pendingClaims(paymentClaims) {
  return paymentClaims.filter((c) => c.status === 'PENDENTE_VERIFICACAO');
}

export function arquivoReminders(shippingRequests, items) {
  const now = Date.now();
  return shippingRequests
    .filter((r) => r.status === 'PROCESSADO' && r.pagFrete === 'PAGO' && r.rastreio && r.rastreioAt)
    .map((r) => {
      const its = (r.itemIds || []).map((id) => items.find((i) => i.id === id)).filter(Boolean);
      const pending = its.filter((it) => it.statusEnvio !== 'ENTREGUE');
      return { req: r, its, pending, days: daysSince(r.rastreioAt) };
    })
    .filter((x) => x.pending.length > 0 && x.days !== null && x.days >= REMINDER_DAYS)
    .filter((x) => !x.req.reminderSnoozedUntil || new Date(x.req.reminderSnoozedUntil).getTime() <= now)
    .sort((a, b) => b.days - a.days);
}

// ---------- Inter (international shipping boxes) ----------

export function interBoxForItem(interBoxes, itemId) {
  return interBoxes.find((b) => Array.isArray(b.itemIds) && b.itemIds.includes(itemId)) || null;
}

// Step 1 — Frete Inter: one price per category, applied to every item tagged with it.
export function interBoxFreteTotal(box) {
  const priceByCat = {};
  (box.categories || []).forEach((c) => { priceByCat[c.id] = Number(c.value) || 0; });
  const map = box.itemCategoryMap || {};
  return Object.values(map).reduce((sum, catId) => sum + (priceByCat[catId] || 0), 0);
}

// Step 2 — Taxa: an individual, manually-edited value per item.
export function interBoxTaxaTotal(box) {
  return Object.values(box.itemTaxaMap || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

export function interBoxTotal(box) {
  return interBoxFreteTotal(box) + interBoxTaxaTotal(box);
}
