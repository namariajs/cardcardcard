import { useState, useEffect, useRef } from 'react';
import { loadJSON, saveJSON } from '../lib/storage';

const RETRY_DELAY_MS = 4000;

// Loads `key` from storage once on mount (falling back to `initialValue` the first time
// the app ever runs), then keeps storage in sync automatically every time the returned
// state changes. `migrate` is an optional function that can upgrade older saved shapes
// (e.g. adding a field that didn't exist in a previous version) — it receives the loaded
// data and should return the (possibly modified) data to use.
//
// Two safeguards protect stored data from a flaky connection (this hook runs for every
// visitor, joiner or GOM, on every page load — not just GOM sessions):
//   1. A failed load (network blip, RLS hiccup, timeout) retries after a delay instead of
//      falling back to `initialValue` — loadJSON/storage.get now throw on real failures
//      rather than swallowing them, so "load failed" and "key genuinely has no row yet"
//      are distinguishable. Saving is only enabled once a load actually succeeds, so a
//      flaky connection delays data appearing instead of silently wiping it.
//   2. Even so, the save effect refuses to persist an empty array over a collection that
//      last held more than one entry — a legitimate one-at-a-time delete only ever drops
//      the count by one per update, so a multi-item collection collapsing to empty in a
//      single update is a bug, not a user action, and never gets written.
export function usePersistedState(key, initialValue, migrate) {
  const [value, setValue] = useState(() => (typeof initialValue === 'function' ? initialValue() : initialValue));
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    async function attemptLoad() {
      const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
      try {
        let data = await loadJSON(key, fallback);
        if (migrate) data = migrate(data) || data;
        if (cancelled) return;
        setValue(data);
        loadedRef.current = true;
        setLoaded(true);
      } catch (e) {
        if (cancelled) return;
        console.warn(`usePersistedState: failed to load "${key}", retrying in ${RETRY_DELAY_MS}ms`, e);
        retryTimer = setTimeout(attemptLoad, RETRY_DELAY_MS);
      }
    }

    attemptLoad();
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loadedRef.current) return;
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    if (Array.isArray(value) && value.length === 0 && Array.isArray(prev) && prev.length > 1) {
      console.error(`usePersistedState: refusing to save an empty "${key}" over ${prev.length} previously stored entries — this looks like a bug, not an intentional bulk delete.`);
      return;
    }
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue, loaded];
}
