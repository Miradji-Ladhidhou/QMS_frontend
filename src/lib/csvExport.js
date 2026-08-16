// Point-virgule comme separateur et BOM UTF-8 : Excel FR (locale par defaut) n'interprete
// correctement les colonnes qu'avec ce separateur, et le BOM evite les accents corrompus.
function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportToCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(';'));
  const csvContent = '\uFEFF' + lines.join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
