// Check-list (QCM) d'audit : réponses de l'auditeur pendant l'audit. Miroir de
// backend/src/services/auditChecklist.js.

export const CHECKLIST_ANSWERS = [
  { value: 'conform', label: 'Conforme', active: 'border-emerald-600 bg-emerald-600 text-white', idle: 'border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700' },
  { value: 'nonconform', label: 'Non conforme', active: 'border-red-600 bg-red-600 text-white', idle: 'border-slate-300 text-slate-700 hover:border-red-500 hover:text-red-700' },
  { value: 'na', label: 'Sans objet', active: 'border-slate-500 bg-slate-500 text-white', idle: 'border-slate-300 text-slate-700 hover:border-slate-500' },
];

export const CHECKLIST_ANSWER_LABELS = { conform: 'Conforme', nonconform: 'Non conforme', na: 'Sans objet' };

// Taux de conformité = conformes / (conformes + non conformes) : « sans objet » n'est ni une réussite ni
// un échec, une question sans réponse n'est pas encore évaluée. null tant qu'aucune réponse ne compte.
export function summarizeChecklist(items) {
  const count = (answer) => items.filter((item) => item.answer === answer).length;
  const conform = count('conform');
  const nonconform = count('nonconform');
  const na = count('na');
  const evaluated = conform + nonconform;
  return {
    total: items.length,
    answered: conform + nonconform + na,
    conform,
    nonconform,
    na,
    conformity_percent: evaluated === 0 ? null : Math.round((conform / evaluated) * 1000) / 10,
  };
}

// Couleur de la pastille de taux : vert à partir de 90 %, orange à partir de 70 %, rouge en dessous.
export function conformityTone(percent) {
  if (percent === null || percent === undefined) return 'bg-slate-100 text-slate-500';
  if (percent >= 90) return 'bg-emerald-100 text-emerald-700';
  if (percent >= 70) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}
