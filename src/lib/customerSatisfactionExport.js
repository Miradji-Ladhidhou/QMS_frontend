import { SATISFACTION_METHOD_LABELS } from './customerSatisfactionStatus.js';

// Colonnes/lignes d'export satisfaction client, partagées entre CustomerSatisfaction.jsx
// (liste, plusieurs lignes) et CustomerSatisfactionDetail.jsx (fiche d'une seule enquête, une
// seule ligne) — mêmes 8 champs des deux côtés.
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function buildExportColumns({ forPdf } = {}) {
  return [
    { key: 'customer_name', label: 'Client', width: forPdf ? 0.18 : undefined },
    { key: 'survey_date', label: 'Date', width: forPdf ? 0.1 : undefined },
    { key: 'method', label: 'Méthode', width: forPdf ? 0.14 : undefined },
    { key: 'score', label: 'Note', width: forPdf ? 0.08 : undefined },
    { key: 'service', label: 'Service', width: forPdf ? 0.15 : undefined },
    { key: 'comments', label: 'Commentaires', width: forPdf ? 0.25 : undefined },
    { key: 'linked_capa', label: 'CAPA liée', width: forPdf ? 0.1 : undefined },
    { key: 'category', label: 'Dossier', width: forPdf ? 0.1 : undefined },
  ];
}

export function buildExportRows(source) {
  return source.map((survey) => ({
    customer_name: survey.customer_name,
    survey_date: formatDate(survey.survey_date),
    method: SATISFACTION_METHOD_LABELS[survey.method] || survey.method,
    score: `${survey.score}/5`,
    service: survey.service?.name || '',
    comments: survey.comments || '',
    linked_capa: survey.linked_capa?.number || '',
    category: survey.category?.name || '',
  }));
}
