import { api } from './api.js';

// Déclenche le téléchargement d'un blob PDF déjà reçu — factorisé car utilisé par tous les
// exports PDF générés côté serveur (rapport générique ici, mais aussi fiche de participation
// et certificat de réussite dans Trainings.jsx) qui partagent le même geste final.
function triggerPdfDownload(blob, filename) {
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
  triggerPdfDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}

// POST générique pour les exports PDF non tabulaires (fiche de participation, certificat...) —
// le backend attend un body différent selon la route, donc on lui laisse tel quel plutôt que de
// forcer une forme commune.
export async function postForPdfDownload(url, body, filename) {
  const response = await api.post(url, body, { responseType: 'blob' });
  triggerPdfDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}

// GET pour les PDF sans body (certificat d'une réalisation déjà identifiée par son id).
export async function getPdfDownload(url, filename) {
  const response = await api.get(url, { responseType: 'blob' });
  triggerPdfDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}
