export const TRAINING_STATUS_LABELS = {
  up_to_date: 'À jour',
  due_soon: 'À renouveler bientôt',
  expired: 'Expiré',
  never_done: 'Jamais fait',
  // Poste non concerné par cette formation (required_job_titles) — distinct de "Jamais fait",
  // qui doit rester réservé à un vrai manque pour un poste qui en a besoin.
  not_applicable: 'Non concerné',
};

export const TRAINING_STATUS_STYLES = {
  up_to_date: 'bg-emerald-100 text-emerald-700',
  due_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  never_done: 'bg-slate-100 text-slate-500',
  not_applicable: 'bg-slate-50 text-slate-300',
};
