import { api } from './api.js';

// Miroir de exportToCsv (csvExport.js) mais le PDF est généré côté serveur (pdfkit, voir
// backend/src/routes/reports.js) pour l'en-tête logo/entreprise, qu'un navigateur ne peut pas
// produire seul sans dépendance supplémentaire. columns : [{ key, label, width? }], width en
// fraction de la largeur de page (0-1), fournie pour toutes les colonnes ou aucune.
export async function exportToPdf(filename, title, columns, rows, { subtitle } = {}) {
  const response = await api.post(
    '/reports/table-pdf',
    { title, subtitle, columns, rows },
    { responseType: 'blob' }
  );

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
