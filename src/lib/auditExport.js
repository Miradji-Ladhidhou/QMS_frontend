import { AUDIT_STATUS_LABELS, AUDIT_TYPE_LABELS } from './auditStatus.js';
import { QUALIFICATION_LABELS, qualificationOf } from './auditorQualification.js';

// Colonnes/lignes d'export de la LISTE des audits (Audits.jsx). La fiche d'un audit a ses exports
// dédiés côté serveur (PDF/Word/Excel, voir AuditDetail.jsx).
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// width uniquement pour le PDF (forPdf) — Excel/Word/CSV n'ont pas cette contrainte de largeur imprimée.
export function buildAuditExportColumns({ forPdf } = {}) {
  return [
    { key: 'title', label: 'Titre', width: forPdf ? 0.2 : undefined },
    { key: 'type', label: 'Type', width: forPdf ? 0.1 : undefined },
    { key: 'status', label: 'Statut', width: forPdf ? 0.1 : undefined },
    { key: 'scope', label: 'Périmètre', width: forPdf ? 0.16 : undefined },
    { key: 'service', label: 'Service', width: forPdf ? 0.1 : undefined },
    { key: 'auditor', label: 'Auditeur', width: forPdf ? 0.1 : undefined },
    { key: 'auditor_qualification', label: 'Qualification auditeur', width: forPdf ? 0.1 : undefined },
    { key: 'planned_date', label: 'Date planifiée', width: forPdf ? 0.1 : undefined },
    { key: 'completed_date', label: 'Date réalisée', width: forPdf ? 0.1 : undefined },
    { key: 'conclusion', label: 'Conclusion', width: forPdf ? 0.16 : undefined },
    { key: 'category', label: 'Dossier', width: forPdf ? 0.1 : undefined },
  ];
}

export function buildAuditExportRows(source, qualifications) {
  return source.map((audit) => ({
    title: audit.title,
    type: AUDIT_TYPE_LABELS[audit.audit_type] || audit.audit_type,
    status: AUDIT_STATUS_LABELS[audit.status] || audit.status,
    scope: audit.scope || '',
    service: audit.service?.name || '',
    auditor: audit.lead?.full_name || '',
    auditor_qualification:
      audit.lead_auditor && qualifications && qualifications.trainings.length > 0
        ? QUALIFICATION_LABELS[qualificationOf(qualifications.byUser, audit.lead_auditor).status]
        : '',
    planned_date: formatDate(audit.planned_date),
    completed_date: formatDate(audit.completed_date),
    conclusion: audit.conclusion || '',
    category: audit.category?.name || '',
  }));
}
