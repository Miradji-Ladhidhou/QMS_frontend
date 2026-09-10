// §9.1.1 : l'organisme doit déterminer les méthodes d'obtention de l'information sur la
// perception du client. Ce module en documente 5.
export const SATISFACTION_METHOD_LABELS = {
  questionnaire: 'Questionnaire',
  phone: 'Appel téléphonique',
  email: 'E-mail',
  in_person: 'En personne',
  other: 'Autre',
};

export const SATISFACTION_METHOD_STYLES = {
  questionnaire: 'bg-blue-100 text-blue-700',
  phone: 'bg-violet-100 text-violet-700',
  email: 'bg-cyan-100 text-cyan-700',
  in_person: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
};

// Échelle 1-5, même convention que les évaluations fournisseurs. Couleur du plus rouge
// (insatisfait) au plus vert (très satisfait) pour un repérage visuel immédiat.
export const SATISFACTION_SCORE_STYLES = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-lime-100 text-lime-700',
  5: 'bg-emerald-100 text-emerald-700',
};
