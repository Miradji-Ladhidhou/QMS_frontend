import { PDCA_STATUS_LABELS } from './pdcaStatus.js';

// Colonnes/lignes d'export PDCA, partagées entre Pdca.jsx (liste, plusieurs lignes) et
// PdcaDetail.jsx (fiche d'un seul projet, une seule ligne) — même 13 champs des deux côtés.
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function buildExportColumns({ forPdf } = {}) {
  return [
    { key: 'title', label: 'Titre', width: forPdf ? 0.16 : undefined },
    { key: 'status', label: 'Statut', width: forPdf ? 0.1 : undefined },
    { key: 'service', label: 'Service', width: forPdf ? 0.12 : undefined },
    { key: 'owner', label: 'Responsable', width: forPdf ? 0.12 : undefined },
    { key: 'target_date', label: 'Date cible', width: forPdf ? 0.1 : undefined },
    { key: 'closed_at', label: 'Date de clôture', width: forPdf ? 0.1 : undefined },
    { key: 'description', label: 'Description', width: forPdf ? 0.14 : undefined },
    { key: 'plan_content', label: 'Plan', width: forPdf ? 0.14 : undefined },
    { key: 'do_content', label: 'Do', width: forPdf ? 0.14 : undefined },
    { key: 'check_content', label: 'Check', width: forPdf ? 0.14 : undefined },
    { key: 'act_content', label: 'Act', width: forPdf ? 0.14 : undefined },
    { key: 'linked_capa', label: 'CAPA liée', width: forPdf ? 0.12 : undefined },
    { key: 'category', label: 'Dossier', width: forPdf ? 0.12 : undefined },
  ];
}

export function buildExportRows(source) {
  return source.map((pdca) => ({
    title: pdca.title,
    status: PDCA_STATUS_LABELS[pdca.status] || pdca.status,
    service: pdca.service?.name || '',
    owner: pdca.owner_user?.full_name || '',
    target_date: formatDate(pdca.target_date),
    closed_at: formatDate(pdca.closed_at),
    description: pdca.description || '',
    plan_content: pdca.plan_content || '',
    do_content: pdca.do_content || '',
    check_content: pdca.check_content || '',
    act_content: pdca.act_content || '',
    linked_capa: pdca.linked_capa?.number || '',
    category: pdca.category?.name || '',
  }));
}
