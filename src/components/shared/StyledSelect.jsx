import { useEffect, useMemo, useRef, useState } from 'react';

function normalizeOptions(options) {
  return (options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export default function StyledSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const current = normalized.find((o) => o.value === value);

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
    <div className="styled-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className="styled-select"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      >
        <span>{current ? current.label : placeholder}</span>
        <span className="styled-select-arrow">▾</span>
      </button>
      {open && (
        <div className="autocomplete-dropdown">
          {normalized.map((opt) => (
            <div
              key={opt.value}
              className={`autocomplete-option${opt.value === value ? ' selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
            >
              {opt.value === value && '✓ '}{opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
