// Persistence layer.
//
// The original single-file prototype ran inside Claude's artifact sandbox and used a
// bespoke `window.storage` API (get/set/delete, all async, backed by Anthropic's own
// key-value service). This module backs that same API with a Supabase table
// (`app_storage`, columns: key text primary key, value text) so data survives across
// devices/browsers instead of living in one browser's localStorage.
//
// The async signatures are kept identical on purpose: every call site elsewhere in the
// app (`await storage.get(...)`, `await storage.set(...)`) works unchanged regardless of
// the underlying store. If this app ever changes backends again, only this file needs to
// change.

import { supabase } from './supabaseClient';

const TABLE = 'app_storage';

// Notified after every successful write, so UI that wants to reflect "last modified" (e.g.
// StatsBar's "Última atualização") can refresh live instead of only on page load.
const writeListeners = new Set();
export function onStorageWrite(fn) {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
}

export const storage = {
  // Unlike the other methods here, this one intentionally lets errors propagate (instead of
  // catching and returning null) — callers like loadJSON need to tell "key genuinely has no
  // row yet" (data is null, error is null) apart from "the request failed" (network blip,
  // RLS hiccup, timeout), since silently treating the latter as the former is how a transient
  // failure turns into real stored data getting overwritten by a fallback default.
  async get(key) {
    const { data, error } = await supabase.from(TABLE).select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: data.value };
  },

  // Sets updated_at explicitly rather than relying on the column's now() default — a
  // default only fills in on INSERT, but upsert() turns into an UPDATE for a key that
  // already exists, and Postgres never re-runs a column default on UPDATE. Without this,
  // updated_at would freeze at the row's original insert time forever.
  async set(key, value) {
    try {
      const { error } = await supabase.from(TABLE).upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      writeListeners.forEach((fn) => fn());
      return { key, value };
    } catch (e) {
      console.error('storage.set error', e);
      return null;
    }
  },

  async delete(key) {
    try {
      const { error } = await supabase.from(TABLE).delete().eq('key', key);
      if (error) throw error;
      return { key, deleted: true };
    } catch (e) {
      console.error('storage.delete error', e);
      return null;
    }
  },

  // Most recent updated_at across every row — items, registry, photos, receipts, anything
  // — used to show a real "last modified" timestamp instead of a hand-maintained constant.
  async getLastUpdatedAt() {
    try {
      const { data, error } = await supabase.from(TABLE).select('updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data ? data.updated_at : null;
    } catch (e) {
      console.error('storage.getLastUpdatedAt error', e);
      return null;
    }
  },

  async list(prefix = '') {
    try {
      const { data, error } = await supabase.from(TABLE).select('key').like('key', `${prefix}%`);
      if (error) throw error;
      return { keys: (data || []).map((row) => row.key) };
    } catch (e) {
      console.error('storage.list error', e);
      return null;
    }
  },
};

// ---------- JSON convenience helpers ----------
// Most of the app stores whole collections (items, registry, etc.) as a single JSON blob
// per key, so these small helpers save every call site from repeating try/parse boilerplate.

// Also lets errors propagate rather than swallowing them into `fallback` — see the note on
// storage.get above. A malformed JSON.parse is a real problem too, not an empty collection.
export async function loadJSON(key, fallback) {
  const res = await storage.get(key);
  return res && res.value ? JSON.parse(res.value) : fallback;
}

export async function saveJSON(key, value) {
  try {
    await storage.set(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('saveJSON error', e);
    return false;
  }
}

// ---------- photo storage ----------
// Photos are stored one-per-key (item-photo:<id>) rather than inside the items blob, so a
// large photo collection never bloats the payload every item list needs to load. Images
// are downsized + re-encoded as JPEG before storage to keep row size/network payload sane.

export function resizeImageFile(file, maxDim = 640, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height); height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function savePhoto(id, dataUrl) {
  try { await storage.set('item-photo:' + id, dataUrl); return true; }
  catch (e) { console.error('Photo storage error', e); return false; }
}
export async function loadPhoto(id) {
  try {
    const res = await storage.get('item-photo:' + id);
    return res && res.value ? res.value : null;
  } catch (e) { return null; }
}
export async function deletePhoto(id) {
  try { await storage.delete('item-photo:' + id); } catch (e) { /* ignore */ }
}

// ---------- payment receipts ----------
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export async function saveReceipt(claimId, dataUrl) {
  try { await storage.set('payment-receipt:' + claimId, dataUrl); return true; }
  catch (e) { console.error('Receipt storage error', e); return false; }
}
export async function loadReceipt(claimId) {
  try {
    const res = await storage.get('payment-receipt:' + claimId);
    return res && res.value ? res.value : null;
  } catch (e) { return null; }
}
export async function deleteReceipt(claimId) {
  try { await storage.delete('payment-receipt:' + claimId); } catch (e) { /* ignore */ }
}
