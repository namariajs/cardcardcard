import { useState, useEffect, useRef } from 'react';
import { loadJSON, saveJSON } from '../lib/storage';

// Loads `key` from storage once on mount (falling back to `initialValue` the first time
// the app ever runs), then keeps storage in sync automatically every time the returned
// state changes. `migrate` is an optional function that can upgrade older saved shapes
// (e.g. adding a field that didn't exist in a previous version) — it receives the loaded
// data and should return the (possibly modified) data to use.
export function usePersistedState(key, initialValue, migrate) {
  const [value, setValue] = useState(() => (typeof initialValue === 'function' ? initialValue() : initialValue));
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
      let data = await loadJSON(key, fallback);
      if (migrate) data = migrate(data) || data;
      if (!cancelled) {
        setValue(data);
        loadedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loadedRef.current) return;
    saveJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}
