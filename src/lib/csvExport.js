// Point-virgule comme separateur et BOM UTF-8 : Excel FR (locale par defaut) n'interprete
// correctement les colonnes qu'avec ce separateur, et le BOM evite les accents corrompus.
function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const BOM = String.fromCharCode(0xfeff);

// title falsy (ex. modèle d'import vierge, voir Kpis.jsx) => aucun bloc métadonnées, comportement
// historique inchangé — un fichier pensé pour être réimporté tel quel ne doit pas voir sa
// première ligne polluée. Pour un vrai export de données, ce bloc donne au CSV la même
// traçabilité qu'un PDF exporté (voir listReportPdf.js) : qui, quand, sur quel périmètre.
export function exportToCsv(filename, title, headers, rows, { generatedBy, subtitle } = {}) {
  const metaRows = title
    ? [
        [title],
        [`Généré par ${generatedBy || 'Utilisateur inconnu'} le ${new Date().toLocaleString('fr-FR')}`],
        ...(subtitle ? [[subtitle]] : []),
        [],
      ]
    : [];

  const lines = [...metaRows, headers, ...rows].map((row) => row.map(escapeCsvCell).join(';'));
  const csvContent = BOM + lines.join('\r\n');

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
