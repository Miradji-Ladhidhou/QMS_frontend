export function getKpiStatus(value, target, targetDirection = 'min') {
  if (value === null || value === undefined || target === null || target === undefined) {
    return 'neutral';
  }
  const meetsTarget = targetDirection === 'max' ? value <= target : value >= target;
  return meetsTarget ? 'good' : 'bad';
}

export const KPI_STATUS_STYLES = {
  good: 'text-emerald-700',
  bad: 'text-red-700',
  neutral: 'text-slate-400',
};

// Variante pastille (fond + texte), pour un badge à côté du nom du KPI plutôt qu'un simple
// texte coloré — même couleurs que KPI_STATUS_STYLES. Jamais 'neutral' (pas d'objectif ou pas
// encore de valeur) : rien à annoncer, voir KpiCard.jsx où ce badge n'est affiché que si
// StatusIcon est défini.
export const KPI_STATUS_BADGE_STYLES = {
  good: 'bg-emerald-100 text-emerald-700',
  bad: 'bg-red-100 text-red-700',
};

export const KPI_STATUS_LABELS = {
  good: 'Objectif atteint',
  bad: "Sous l'objectif",
  neutral: '',
};
