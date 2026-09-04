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

// Génère le PDF (pdfkit côté serveur, voir backend/src/routes/reports.js) sans le télécharger —
// factorisé entre exportToPdf (téléchargement) et exportToDrive (upload comme document) pour ne
// jamais appeler /table-pdf deux fois pour le même export.
async function fetchPdfBlob(title, columns, rows, { subtitle, generatedBy } = {}) {
  const response = await api.post(
    '/reports/table-pdf',
    { title, subtitle, generatedBy, columns, rows },
    { responseType: 'blob' }
  );
  return new Blob([response.data], { type: 'application/pdf' });
}

// Miroir de exportToCsv (csvExport.js) mais le PDF est généré côté serveur (pdfkit, voir
// backend/src/routes/reports.js) pour l'en-tête logo/entreprise, qu'un navigateur ne peut pas
// produire seul sans dépendance supplémentaire. columns : [{ key, label, width? }], width en
// fraction de la largeur de page (0-1), fournie pour toutes les colonnes ou aucune.
export async function exportToPdf(filename, title, columns, rows, options = {}) {
  const blob = await fetchPdfBlob(title, columns, rows, options);
  triggerBlobDownload(blob, filename);
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

// yyyyMMddHHmmss — évite toute collision avec la numérotation manuelle des documents existants
// (ex. "QP-001") sans avoir besoin d'interroger la base pour un numéro "propre".
function buildExportDocumentNumber(moduleCode) {
  const stamp = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
  return `EXPORT-${moduleCode}-${stamp}`;
}

// Enregistre un blob PDF déjà généré comme un vrai document — même principe que la page
// Documents : POST /api/documents route déjà tout seul vers Google Drive ou Supabase selon le
// réglage du tenant (resolveTenantStorageProvider, backend/src/routes/documents.js), sans
// qu'aucun code ici n'ait à connaître lequel. Pas de category_id fourni volontairement (voir le
// plan : forcer un choix de catégorie casserait le geste "un seul bouton", et pré-provisionner
// une catégorie par module se heurterait à POST /api/categories réservé aux admins) — le
// document atterrit à la racine, reclassable ensuite comme n'importe quel document depuis sa
// propre page. Factorisé entre exportToDrive (export tabulaire) et getPdfAndSaveToDrive (PDF
// déjà généré d'un seul enregistrement, ex. une fiche CAPA) — même geste final, seule la source
// du blob change.
async function uploadPdfAsDocument(moduleCode, title, blob, { subtitle } = {}) {
  const form = new FormData();
  form.append('file', blob, `${title}.pdf`);
  form.append('number', buildExportDocumentNumber(moduleCode));
  form.append('title', title);
  if (subtitle) form.append('description', subtitle);

  const { data } = await api.post('/documents', form);
  return data;
}

export async function exportToDrive(moduleCode, title, columns, rows, { subtitle, generatedBy } = {}) {
  const blob = await fetchPdfBlob(title, columns, rows, { subtitle, generatedBy });
  return uploadPdfAsDocument(moduleCode, title, blob, { subtitle });
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

// Même PDF que getPdfDownload (un enregistrement déjà identifié par son id, ex. GET
// /capas/:id/pdf), mais déposé sur le Drive du tenant comme un vrai document plutôt que
// téléchargé — voir uploadPdfAsDocument ci-dessus.
export async function getPdfAndSaveToDrive(url, moduleCode, title) {
  const response = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  return uploadPdfAsDocument(moduleCode, title, blob);
}

// POST pour un export Word (.docx) — même geste que postForPdfDownload, mais un .docx ne
// s'affiche pas dans un onglet comme un PDF : toujours un téléchargement direct, jamais
// openBlankTab (voir services/procedureWord.js côté backend pour le rendu lui-même).
export async function postForWordDownload(url, body, filename) {
  const response = await api.post(url, body, { responseType: 'blob' });
  triggerBlobDownload(
    new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    filename
  );
}
