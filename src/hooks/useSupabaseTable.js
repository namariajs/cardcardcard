import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const RETRY_DELAY_MS = 4000;

// Real-table counterpart to usePersistedState (same load-once-then-keep-in-sync
// shape, same retry-on-failure safeguard for a flaky connection) but backed by an
// actual Postgres table instead of a JSON blob in app_storage. Writes are
// optimistic (local state updates immediately) with the Supabase call firing
// alongside — matching storage.js's existing philosophy of logging write
// failures rather than throwing, since callers here don't await these.
export function useSupabaseTable(table, { orderBy = 'created_at', ascending = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    async function attemptLoad() {
      const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending });
      if (cancelled) return;
      if (error) {
        console.warn(`useSupabaseTable: failed to load "${table}", retrying in ${RETRY_DELAY_MS}ms`, error);
        retryTimer = setTimeout(attemptLoad, RETRY_DELAY_MS);
        return;
      }
      setRows(data || []);
      loadedRef.current = true;
      setLoaded(true);
    }

    attemptLoad();
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  async function upsertRow(row) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx > -1) { const copy = [...prev]; copy[idx] = row; return copy; }
      return [...prev, row];
    });
    const { error } = await supabase.from(table).upsert(row);
    if (error) console.error(`useSupabaseTable: upsert into "${table}" failed`, error);
  }

  async function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.error(`useSupabaseTable: delete from "${table}" failed`, error);
  }

  return [rows, loaded, { upsertRow, removeRow }];
}
