// Persistence layer.
//
// The original single-file prototype ran inside Claude's artifact sandbox and used a
// bespoke `window.storage` API (get/set/delete, all async, backed by Anthropic's own
// key-value service). Outside that sandbox there's no such API, so this module swaps in
// `localStorage` as the backing store for a real, deployable app.
//
// The async signatures are kept identical on purpose: every call site elsewhere in the
// app (`await storage.get(...)`, `await storage.set(...)`) works unchanged whether the
// underlying store is synchronous localStorage or a future real backend/API. If this app
// ever grows a server, only this file needs to change.

const PREFIX = 'godesk:';

function keyFor(key) {
  return PREFIX + key;
}

export const storage = {
  async get(key) {
    try {
      const raw = window.localStorage.getItem(keyFor(key));
      if (raw === null) return null;
      return { key, value: raw };
    } catch (e) {
      console.error('storage.get error', e);
      return null;
    }
  },

  async set(key, value) {
    try {
      window.localStorage.setItem(keyFor(key), value);
      return { key, value };
    } catch (e) {
      console.error('storage.set error', e);
      return null;
    }
  },

  async delete(key) {
    try {
      window.localStorage.removeItem(keyFor(key));
      return { key, deleted: true };
    } catch (e) {
      console.error('storage.delete error', e);
      return null;
    }
  },

  async list(prefix = '') {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          const bare = k.slice(PREFIX.length);
          if (bare.startsWith(prefix)) keys.push(bare);
        }
      }
      return { keys };
    } catch (e) {
      console.error('storage.list error', e);
      return null;
    }
  },
};

// ---------- JSON convenience helpers ----------
// Most of the app stores whole collections (items, registry, etc.) as a single JSON blob
// per key, so these small helpers save every call site from repeating try/parse boilerplate.

export async function loadJSON(key, fallback) {
  try {
    const res = await storage.get(key);
    return res && res.value ? JSON.parse(res.value) : fallback;
  } catch (e) {
    return fallback;
  }
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
// are downsized + re-encoded as JPEG before storage to keep localStorage usage sane.

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
