import { CAPA_PRIORITY_LABELS } from './capaStatus.js';
import { COMPLAINT_STATUS_LABELS } from './complaintStatus.js';

// Colonnes/lignes d'export réclamation, partagées entre Complaints.jsx (liste, plusieurs
// lignes) et ComplaintDetail.jsx (fiche d'une seule réclamation, une seule ligne) — mêmes 16
// champs des deux côtés.
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function buildExportColumns({ forPdf } = {}) {
  return [
    { key: 'customer_name', label: 'Client', width: forPdf ? 0.14 : undefined },
    { key: 'customer_contact', label: 'Contact', width: forPdf ? 0.12 : undefined },
    { key: 'description', label: 'Description', width: forPdf ? 0.2 : undefined },
    { key: 'product_service', label: 'Produit/Service', width: forPdf ? 0.12 : undefined },
    { key: 'severity', label: 'Gravité', width: forPdf ? 0.08 : undefined },
    { key: 'status', label: 'Statut', width: forPdf ? 0.1 : undefined },
    { key: 'service', label: 'Service', width: forPdf ? 0.1 : undefined },
    { key: 'received_date', label: 'Date de réception', width: forPdf ? 0.1 : undefined },
    { key: 'due_date', label: 'Échéance', width: forPdf ? 0.1 : undefined },
    { key: 'assigned', label: 'Assigné', width: forPdf ? 0.1 : undefined },
    { key: 'root_cause', label: 'Cause racine', width: forPdf ? 0.14 : undefined },
    { key: 'resolution', label: 'Résolution', width: forPdf ? 0.14 : undefined },
    { key: 'resolution_date', label: 'Date de résolution', width: forPdf ? 0.1 : undefined },
    { key: 'customer_satisfied', label: 'Client satisfait', width: forPdf ? 0.1 : undefined },
    { key: 'linked_capa', label: 'CAPA liée', width: forPdf ? 0.1 : undefined },
    { key: 'category', label: 'Dossier', width: forPdf ? 0.1 : undefined },
  ];
}

export function buildExportRows(source) {
  return source.map((complaint) => ({
    customer_name: complaint.customer_name,
    customer_contact: complaint.customer_contact || '',
    description: complaint.description || '',
    product_service: complaint.product_service || '',
    severity: CAPA_PRIORITY_LABELS[complaint.severity] || complaint.severity,
    status: COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status,
    service: complaint.service?.name || '',
    received_date: formatDate(complaint.received_date),
    due_date: formatDate(complaint.due_date),
    assigned: complaint.assigned?.full_name || '',
    root_cause: complaint.root_cause || '',
    resolution: complaint.resolution || '',
    resolution_date: formatDate(complaint.resolution_date),
    customer_satisfied: complaint.customer_satisfied === null ? '' : complaint.customer_satisfied ? 'Oui' : 'Non',
    linked_capa: complaint.linked_capa?.number || '',
    category: complaint.category?.name || '',
  }));
}
