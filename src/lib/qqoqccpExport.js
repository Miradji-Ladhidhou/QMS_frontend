import { QQOQCCP_STATUS_LABELS } from './qqoqccpStatus.js';

// Colonnes/lignes d'export QQOQCCP, partagées entre Qqoqccp.jsx (liste, plusieurs lignes) et
// QqoqccpDetail.jsx (fiche d'une seule analyse, une seule ligne) — mêmes 13 champs des deux
// côtés. Contrairement à la liste (qui doit repasser par ?full=true, voir Qqoqccp.jsx, car sa
// route GET / est volontairement allégée), la fiche détail lit déjà tous ces champs directement
// depuis GET /qqoqccp/:id (détail complet).
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function buildExportColumns({ forPdf } = {}) {
  return [
    { key: 'title', label: 'Titre', width: forPdf ? 0.12 : undefined },
    { key: 'status', label: 'Statut', width: forPdf ? 0.08 : undefined },
    { key: 'qui', label: 'Qui ?', width: forPdf ? 0.1 : undefined },
    { key: 'quoi', label: 'Quoi ?', width: forPdf ? 0.1 : undefined },
    { key: 'ou_', label: 'Où ?', width: forPdf ? 0.1 : undefined },
    { key: 'quand_', label: 'Quand ?', width: forPdf ? 0.1 : undefined },
    { key: 'comment_', label: 'Comment ?', width: forPdf ? 0.1 : undefined },
    { key: 'combien', label: 'Combien ?', width: forPdf ? 0.1 : undefined },
    { key: 'pourquoi', label: 'Pourquoi ?', width: forPdf ? 0.1 : undefined },
    { key: 'ai_synthesis', label: 'Synthèse IA', width: forPdf ? 0.14 : undefined },
    { key: 'linked_capa', label: 'CAPA liée', width: forPdf ? 0.08 : undefined },
    { key: 'category', label: 'Dossier', width: forPdf ? 0.08 : undefined },
    { key: 'created_at', label: 'Créée le', width: forPdf ? 0.08 : undefined },
  ];
}

export function buildExportRows(source) {
  return source.map((analysis) => ({
    title: analysis.title,
    status: QQOQCCP_STATUS_LABELS[analysis.status] || analysis.status,
    qui: analysis.qui || '',
    quoi: analysis.quoi || '',
    ou_: analysis.ou_ || '',
    quand_: analysis.quand_ || '',
    comment_: analysis.comment_ || '',
    combien: analysis.combien || '',
    pourquoi: analysis.pourquoi || '',
    ai_synthesis: analysis.ai_synthesis || '',
    linked_capa: analysis.capa?.number || '',
    category: analysis.category?.name || '',
    created_at: formatDate(analysis.created_at),
  }));
}
