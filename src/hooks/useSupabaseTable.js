import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const RETRY_DELAY_MS = 4000;

// Real-table counterpart to usePersistedState (same load-once-then-keep-in-sync
// shape, same retry-on-failure safeguard for a flaky connection) but backed by an
// actual Postgres table instead of a JSON blob in app_storage. Writes update local
// state optimistically for a snappy UI, but roll back and report { error } if the
// actual Supabase write fails — callers are expected to await this and surface the
// failure, not treat the optimistic update as proof the write landed.
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

  // Returns { error } so callers can surface a real failure to the user instead of
  // trusting the optimistic update — a write that fails silently here previously left
  // the record looking saved in this session (until the next fetch quietly dropped it),
  // which is exactly how a cadastro entry could appear added and then "vanish".
  async function upsertRow(row) {
    let previous;
    setRows((prev) => {
      previous = prev;
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx > -1) { const copy = [...prev]; copy[idx] = row; return copy; }
      return [...prev, row];
    });
    const { error } = await supabase.from(table).upsert(row);
    if (error) {
      console.error(`useSupabaseTable: upsert into "${table}" failed`, error);
      setRows(previous);
    }
    return { error };
  }

  // For creating a brand-new row where the caller has no reason to ever touch an
  // existing one — a plain .insert() rather than .upsert(). If the generated id (or a
  // unique column, e.g. cadastro's lower(social) index) ever collided with an existing
  // row, this errors loudly instead of an upsert silently merging over it.
  async function insertRow(row) {
    setRows((prev) => [...prev, row]);
    const { error } = await supabase.from(table).insert(row);
    if (error) {
      console.error(`useSupabaseTable: insert into "${table}" failed`, error);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
    return { error };
  }

  async function removeRow(id) {
    let previous;
    setRows((prev) => { previous = prev; return prev.filter((r) => r.id !== id); });
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`useSupabaseTable: delete from "${table}" failed`, error);
      setRows(previous);
    }
    return { error };
  }

  return [rows, loaded, { upsertRow, insertRow, removeRow }];
}
