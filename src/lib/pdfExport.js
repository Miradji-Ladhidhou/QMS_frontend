import { api } from './api.js';

// Déclenche le téléchargement d'un blob déjà reçu — factorisé car utilisé par tous les exports
// générés côté serveur (PDF ici, mais aussi le classeur Excel plus bas) qui partagent le même
// geste final.
function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Miroir de exportToCsv (csvExport.js) mais le PDF est généré côté serveur (pdfkit, voir
// backend/src/routes/reports.js) pour l'en-tête logo/entreprise, qu'un navigateur ne peut pas
// produire seul sans dépendance supplémentaire. columns : [{ key, label, width? }], width en
// fraction de la largeur de page (0-1), fournie pour toutes les colonnes ou aucune.
export async function exportToPdf(filename, title, columns, rows, { subtitle, generatedBy } = {}) {
  const response = await api.post(
    '/reports/table-pdf',
    { title, subtitle, generatedBy, columns, rows },
    { responseType: 'blob' }
  );
  triggerBlobDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}

// Même principe qu'exportToPdf, mais produit un vrai classeur Excel (en-têtes figés au
// défilement, largeurs de colonnes, bordures — voir services/listReportXlsx.js) plutôt qu'un
// CSV renommé. Réutilise les mêmes columns que l'export PDF de la page appelante.
export async function exportToXlsx(filename, title, columns, rows, { subtitle, generatedBy } = {}) {
  const response = await api.post(
    '/reports/table-xlsx',
    { title, subtitle, generatedBy, columns, rows },
    { responseType: 'blob' }
  );
  triggerBlobDownload(
    new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}

// POST générique pour les exports PDF non tabulaires (fiche de participation, certificat...) —
// le backend attend un body différent selon la route, donc on lui laisse tel quel plutôt que de
// forcer une forme commune.
export async function postForPdfDownload(url, body, filename) {
  const response = await api.post(url, body, { responseType: 'blob' });
  triggerBlobDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}

// GET pour les PDF sans body (certificat d'une réalisation déjà identifiée par son id).
export async function getPdfDownload(url, filename) {
  const response = await api.get(url, { responseType: 'blob' });
  triggerBlobDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}
