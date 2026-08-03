// Renamed/legacy field values get normalized here so old saved items keep displaying
// correctly instead of showing a raw leftover key.
const LEGACY_STATUS_CEG = { CAMINHO_BR: 'CAMINHO_BRASIL' };

export function migrateItems(list) {
  list.forEach((it) => {
    if (LEGACY_STATUS_CEG[it.statusCeg]) it.statusCeg = LEGACY_STATUS_CEG[it.statusCeg];
    if (it.caixa === undefined) it.caixa = '-';
    if (it.hasPhoto === undefined) it.hasPhoto = false;
    if (it.category === undefined) it.category = '-';
    if (it.grupo === undefined) it.grupo = '-';
    if (it.membro === undefined) it.membro = '-';
    if (it.valorTaxa === undefined) it.valorTaxa = 0;
    if (it.pagTaxa === undefined) it.pagTaxa = 'PENDENTE';
    if (it.tipo === undefined) it.tipo = 'CEG_INTER';
    if (it.prazoItem === undefined) it.prazoItem = null;
    if (it.prazoFreteInter === undefined) it.prazoFreteInter = null;
    if (it.prazoTaxa === undefined) it.prazoTaxa = null;
    if (it.pagItemPaidAt === undefined) it.pagItemPaidAt = null;
    if (it.pagFreteInterPaidAt === undefined) it.pagFreteInterPaidAt = null;
    if (it.pagTaxaPaidAt === undefined) it.pagTaxaPaidAt = null;
    // ATRASADO is no longer a manually stored status for these 3 fields — normalize any
    // legacy value back to PENDENTE; lateness is now derived from prazo/paidAt instead.
    if (it.pagItem === 'ATRASADO') it.pagItem = 'PENDENTE';
    if (it.pagFreteInter === 'ATRASADO') it.pagFreteInter = 'PENDENTE';
    if (it.pagTaxa === 'ATRASADO') it.pagTaxa = 'PENDENTE';
  });
  return list;
}

export function migrateShippingRequests(list) {
  list.forEach((r) => {
    if (!Array.isArray(r.itemIds)) r.itemIds = [];
    if (r.pagFrete === undefined) r.pagFrete = null;
    if (r.rastreio === undefined) r.rastreio = null;
    if (r.rastreioAt === undefined) r.rastreioAt = null;
    if (r.rastreio && !r.rastreioAt) r.rastreioAt = r.processedAt || r.submittedAt || new Date().toISOString();
    if (r.reminderSnoozedUntil === undefined) r.reminderSnoozedUntil = null;
  });
  return list;
}

export function migrateInterBoxes(list) {
  list.forEach((b) => {
    if (!Array.isArray(b.itemIds)) b.itemIds = [];
    if (!Array.isArray(b.categories)) b.categories = [];
    if (!b.itemCategoryMap || typeof b.itemCategoryMap !== 'object') b.itemCategoryMap = {};
    if (!b.itemTaxaMap || typeof b.itemTaxaMap !== 'object') b.itemTaxaMap = {};
  });
  return list;
}
