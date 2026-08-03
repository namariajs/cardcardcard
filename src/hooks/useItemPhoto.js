import { useEffect, useState } from 'react';
import { loadPhoto } from '../lib/storage';

// Photos are stored separately from item records (see lib/storage.js), so each card
// lazily fetches its own photo instead of the whole item list needing to carry image
// data. Returns null while loading / if the item has no photo.
export function useItemPhoto(item) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!item?.hasPhoto) { setUrl(null); return; }
    loadPhoto(item.id).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [item?.id, item?.hasPhoto]);

  return url;
}
