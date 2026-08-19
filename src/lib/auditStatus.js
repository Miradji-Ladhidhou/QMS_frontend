export const AUDIT_STATUS_LABELS = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  closed: 'Clôturé',
};

export const AUDIT_STATUS_STYLES = {
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-purple-100 text-purple-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

export const AUDIT_TYPE_LABELS = {
  process: 'Processus',
  product: 'Produit',
  system: 'Système',
};

export const FINDING_TYPE_LABELS = {
  major_nc: 'Non-conformité majeure',
  minor_nc: 'Non-conformité mineure',
  observation: 'Remarque',
  strength: 'Point fort',
};

export const FINDING_TYPE_STYLES = {
  major_nc: 'bg-red-100 text-red-700',
  minor_nc: 'bg-amber-100 text-amber-700',
  observation: 'bg-slate-100 text-slate-700',
  strength: 'bg-emerald-100 text-emerald-700',
};
