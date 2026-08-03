import { useEffect, useMemo, useRef, useState } from 'react';

function normalizeOptions(options) {
  return (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export default function AutocompleteInput({ value, onChange, options, placeholder, onBlur }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const normalized = useMemo(() => normalizeOptions(options), [options]);

  const filtered = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [normalized, value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function pick(opt) {
    onChange(opt.value);
    setOpen(false);
  }

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      />
      {open && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.map((opt) => (
            <div key={opt.value} className="autocomplete-option" onMouseDown={(e) => { e.preventDefault(); pick(opt); }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
