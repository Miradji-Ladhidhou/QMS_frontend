// Suivi des actions décidées en revue de direction (§9.3.3). Miroir de
// backend/src/services/managementReviewContent.js.

export const ACTION_STATUS_OPTIONS = [
  { value: 'open', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Réalisée' },
  { value: 'cancelled', label: 'Abandonnée' },
];

export const ACTION_STATUS_LABELS = Object.fromEntries(ACTION_STATUS_OPTIONS.map((option) => [option.value, option.label]));

export const ACTION_STATUS_STYLES = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-sky-100 text-sky-700',
  done: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function formatDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR') : '';
}

// « Former les auditeurs — En cours, responsable : Marie, échéance 30/09/2026 (dépassée), CAPA CAPA-1 » : une ligne
// par action, pour le suivi écrit des actions de la revue précédente (§9.3.2 a).
export function describeAction(action) {
  const parts = [ACTION_STATUS_LABELS[action.effective_status || action.status] || action.status];
  if (action.status_derived) parts.push('CAPA liée clôturée');
  if (action.owner_user?.full_name) parts.push(`responsable : ${action.owner_user.full_name}`);
  if (action.due_date) parts.push(`échéance ${formatDate(action.due_date)}${action.is_overdue ? ' (dépassée)' : ''}`);
  if (action.linked_capa) parts.push(`CAPA ${action.linked_capa.number}`);
  return `${action.description} — ${parts.join(', ')}`;
}

// Texte de suivi prêt à insérer dans « Statut des actions de la revue précédente ».
export function buildPreviousActionsText(previousReview) {
  if (!previousReview) return '';
  if (previousReview.actions.length === 0) return `Aucune action n'avait été décidée lors de la revue précédente (${previousReview.title}).`;
  const done = previousReview.actions.filter((action) => action.effective_status === 'done').length;
  const header = `Revue précédente : ${previousReview.title} (${formatDate(previousReview.review_date)}) — ${done}/${previousReview.actions.length} action(s) réalisée(s).`;
  return [header, ...previousReview.actions.map((action) => `- ${describeAction(action)}`)].join('\n');
}
