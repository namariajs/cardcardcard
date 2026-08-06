// Minimal CSV export — no library, matching the app's zero-extra-dependency
// approach everywhere else (see README's dependency list).

function escapeCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// `columns` is [{ key, label }] — `key` may be a dotted path (e.g. 'cadastro.apelido').
export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCell(c.key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), row)))
      .join(',')
  );
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename, csv) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
