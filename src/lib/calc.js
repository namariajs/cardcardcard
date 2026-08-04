import { cegStageIndex, REMINDER_DAYS, PAYMENT_FIELDS, PAYMENT_FIELDS_BY_KEY } from './constants';
import { daysSince } from './format';

const LATE_FEE_PER_DAY = 1;

// deadline is a date-only ISO string ("2026-08-04"); paidAt (when set) is a full ISO
// timestamp. Late days are frozen at the paid moment so the fee stops growing once paid.
// isPago covers items marked PAGO with no paidAt on record (set before automatic
// timestamping existed, or restored from older data) — there's no reliable moment to
// measure lateness against, so they're treated as fee-free rather than still accruing.
export function computeLateFee(deadline, paidAt, isPago = false) {
  if (!deadline) return { lateDays: 0, fee: 0 };
  if (isPago && !paidAt) return { lateDays: 0, fee: 0 };
  const deadlineMs = new Date(deadline).getTime();
  const referenceMs = paidAt ? new Date(paidAt).getTime() : Date.now();
  const lateDays = Math.max(0, Math.floor((referenceMs - deadlineMs) / 86400000));
  return { lateDays, fee: lateDays * LATE_FEE_PER_DAY };
}

export function effectivePagStatus(pagStatus, deadline, paidAt) {
  if (pagStatus === 'PAGO') return 'PAGO';
  return computeLateFee(deadline, paidAt).lateDays > 0 ? 'ATRASADO' : 'PENDENTE';
}

// Bundles the effective status/fee/total for one of PAYMENT_FIELDS (item/freteInter/taxa)
// on a given item — the single source of truth every display site should read from.
export function paymentFieldEffective(item, fieldDef) {
  const base = Number(item[fieldDef.valField]) || 0;
  const deadline = item[fieldDef.prazoField] || null;
  const paidAt = item[fieldDef.paidAtField] || null;
  const pagStatus = item[fieldDef.pagField];
  const { lateDays, fee } = computeLateFee(deadline, paidAt, pagStatus === 'PAGO');
  const status = effectivePagStatus(pagStatus, deadline, paidAt);
  return { status, lateDays, fee, total: base + fee };
}

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
    PAYMENT_FIELDS.forEach((f) => {
      const eff = paymentFieldEffective(it, f);
      if (eff.status === 'PENDENTE') pendingValue += eff.total;
      else if (eff.status === 'PAGO') confirmedValue += eff.total;
      else if (eff.status === 'ATRASADO') { lateValue += eff.total; lateCount++; }
    });
    // pagFreteNacional has no deadline/fee model — it stays a manually-picked status.
    if (it.pagFreteNacional === 'PENDENTE') pendingValue += Number(it.valorFreteNacional) || 0;
    else if (it.pagFreteNacional === 'PAGO') confirmedValue += Number(it.valorFreteNacional) || 0;
    else if (it.pagFreteNacional === 'ATRASADO') { lateValue += Number(it.valorFreteNacional) || 0; lateCount++; }
  });
  const joinerCount = new Set(items.filter((i) => !i.unclaimed).map((i) => i.joiner)).size;
  const cegCount = new Set(items.map((i) => i.ceg).filter((c) => c && c.trim())).size;
  return { total, pendingValue, confirmedValue, lateValue, lateCount, joinerCount, cegCount };
}

export function computePanelStats(list, joinerHandle, shippingRequests) {
  let pendingValue = 0, paidValue = 0, lateValue = 0, lateCount = 0;
  let freteInterPending = 0, taxaPending = 0, freteNacPending = 0, releasedForShipping = 0, shipped = 0, delivered = 0;
  list.forEach((it) => {
    PAYMENT_FIELDS.forEach((f) => {
      const eff = paymentFieldEffective(it, f);
      if (eff.status === 'PENDENTE') pendingValue += eff.total;
      else if (eff.status === 'PAGO') paidValue += eff.total;
      else if (eff.status === 'ATRASADO') { lateValue += eff.total; lateCount++; }
    });
    const freteEff = paymentFieldEffective(it, PAYMENT_FIELDS_BY_KEY.freteInter);
    if (freteEff.status === 'PENDENTE' || freteEff.status === 'ATRASADO') freteInterPending += freteEff.total;
    const taxaEff = paymentFieldEffective(it, PAYMENT_FIELDS_BY_KEY.taxa);
    if (taxaEff.status === 'PENDENTE' || taxaEff.status === 'ATRASADO') taxaPending += taxaEff.total;
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
    return PAYMENT_FIELDS.some((f) => paymentFieldEffective(it, f).status === 'ATRASADO');
  }
  if (filter === 'freteInter') {
    const eff = paymentFieldEffective(it, PAYMENT_FIELDS_BY_KEY.freteInter);
    return eff.status === 'PENDENTE' || eff.status === 'ATRASADO';
  }
  if (filter === 'taxa') {
    const eff = paymentFieldEffective(it, PAYMENT_FIELDS_BY_KEY.taxa);
    return eff.status === 'PENDENTE' || eff.status === 'ATRASADO';
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

export function pendingItemOrders(itemOrders) {
  return itemOrders.filter((o) => o.status === 'PENDENTE');
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
