import { CAPA_EFFECTIVENESS_LABELS, CAPA_PRIORITY_LABELS, CAPA_STATUS_LABELS } from './capaStatus.js';

// Colonnes/lignes d'export CAPA, partagées entre Capas.jsx (liste, plusieurs lignes) et
// CapaDetail.jsx (fiche d'une seule CAPA, une seule ligne) — un seul jeu de 17 champs à faire
// évoluer, jamais deux définitions qui pourraient diverger. severity est délibérément exclu :
// c'est un champ hérité, toujours recopié depuis priority (voir Capas.jsx#handleSubmit), donc
// afficher les deux dupliquerait la même valeur sous deux libellés différents.
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function buildCapaExportColumns() {
  return [
    { key: 'number', label: 'Numéro' },
    { key: 'title', label: 'Objet' },
    { key: 'description', label: 'Description' },
    { key: 'origin', label: 'Origine' },
    { key: 'priority', label: 'Gravité' },
    { key: 'status', label: 'Statut' },
    { key: 'service', label: 'Service' },
    { key: 'due_date', label: 'Échéance' },
    { key: 'assigned', label: 'Responsable' },
    { key: 'root_cause', label: 'Cause racine' },
    { key: 'corrective_action', label: 'Action corrective' },
    { key: 'preventive_action', label: 'Action préventive' },
    { key: 'effectiveness', label: 'Efficacité vérifiée' },
    { key: 'effectiveness_notes', label: "Notes d'efficacité" },
    { key: 'comment', label: 'Commentaire' },
    { key: 'closed_at', label: 'Date de clôture' },
    { key: 'category', label: 'Dossier' },
  ];
}

export function buildCapaExportRows(source) {
  return source.map((capa) => ({
    number: capa.number,
    title: capa.title,
    description: capa.description || '',
    origin: capa.origin || '',
    priority: CAPA_PRIORITY_LABELS[capa.priority] || capa.priority,
    status: CAPA_STATUS_LABELS[capa.status] || capa.status,
    service: capa.service?.name || '',
    due_date: formatDate(capa.due_date),
    assigned: capa.assigned?.full_name || '',
    root_cause: capa.root_cause || '',
    corrective_action: capa.corrective_action || '',
    preventive_action: capa.preventive_action || '',
    effectiveness: CAPA_EFFECTIVENESS_LABELS[capa.effectiveness_verified] || '',
    effectiveness_notes: capa.effectiveness_notes || '',
    comment: capa.comment || '',
    closed_at: formatDate(capa.closed_at),
    category: capa.category?.name || '',
  }));
}
