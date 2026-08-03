import { STATUS_CEG, STATUS_ENVIO, ITEM_CATEGORIES } from './constants';

export const fmt = (n) => 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',');

export const genId = () => 'ITM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
export const genRegId = () => 'JNR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
export const genPayId = () => 'PAY-' + Math.random().toString(36).slice(2, 8).toUpperCase();
export const genBatchId = () => 'BATCH-' + Math.random().toString(36).slice(2, 8).toUpperCase();
export const genShipId = () => 'SHIP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
export const genInterBoxId = () => 'IBOX-' + Math.random().toString(36).slice(2, 8).toUpperCase();
export const genInterCatId = () => 'ICAT-' + Math.random().toString(36).slice(2, 6).toUpperCase();

export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

export const normHandle = (s) => {
  s = String(s || '').trim();
  if (!s) return '';
  return s.startsWith('@') ? s : '@' + s;
};

export function formatCEP(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatCPF(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
export function formatPhoneBR(value) {
  let d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function statusLabel(key, val) {
  const maps = { statusCeg: STATUS_CEG, statusEnvio: STATUS_ENVIO, category: ITEM_CATEGORIES };
  if (maps[key] && maps[key][val]) return maps[key][val];
  if (!val || val === '-') return '—';
  return val.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pagClass(v) {
  if (v === 'PAGO') return 'pago';
  if (v === 'ATRASADO') return 'atrasado';
  return 'pendente';
}

export function hasVal(v) {
  return (Number(v) || 0) > 0;
}

// Combines Membro + Item into the card title (e.g. "Han — Photocard") when a member is
// set, otherwise just shows the item name on its own.
export function itemDisplayTitle(it) {
  if (it.membro && it.membro !== '-') return `${it.membro} — ${it.itemName}`;
  return it.itemName;
}

export function isInterItem(it) {
  return it.tipo === 'CEG_INTER';
}

export function formatClaimDate(iso) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch (e) { return iso; }
}

export function formatDateOnly(iso) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso));
  } catch (e) { return iso; }
}

// Only the date (no time) is shown for "Última atualização" per product decision.
export function formatLastUpdated(iso) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: 'long', year: 'numeric',
    }).format(new Date(iso));
  } catch (e) { return iso; }
}

export function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86400000);
}
