export const NONCONFORMING_OUTPUT_STATUS_LABELS = {
  open: 'Ouverte',
  closed: 'Clôturée',
};

export const NONCONFORMING_OUTPUT_STATUS_STYLES = {
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-emerald-100 text-emerald-700',
};

// §8.7.1 d) : traitements possibles d'un élément de sortie non conforme.
export const NONCONFORMING_OUTPUT_DISPOSITION_LABELS = {
  correction: 'Correction',
  segregation: 'Isolement / confinement',
  return_to_supplier: 'Retour fournisseur',
  concession: 'Dérogation (concession)',
  scrap: 'Mise au rebut',
  other: 'Autre',
};

export const NONCONFORMING_OUTPUT_DISPOSITION_STYLES = {
  correction: 'bg-slate-100 text-slate-700',
  segregation: 'bg-amber-100 text-amber-700',
  return_to_supplier: 'bg-orange-100 text-orange-700',
  concession: 'bg-purple-100 text-purple-700',
  scrap: 'bg-red-100 text-red-700',
  other: 'bg-slate-100 text-slate-700',
};
