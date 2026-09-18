// À moins de WARNING_MARGIN_RATIO (10%) de l'objectif, mais pas encore atteint, le statut est
// 'warning' (orange) plutôt que 'bad' (rouge) — distingue "presque atteint, à surveiller" d'un
// vrai écart. 10% choisi comme repère raisonnable, pas une valeur réglementaire.
const WARNING_MARGIN_RATIO = 0.1;

export function getKpiStatus(value, target, targetDirection = 'min') {
  if (value === null || value === undefined || target === null || target === undefined) {
    return 'neutral';
  }
  const meetsTarget = targetDirection === 'max' ? value <= target : value >= target;
  if (meetsTarget) return 'good';

  const margin = Math.abs(target) * WARNING_MARGIN_RATIO;
  const nearTarget = targetDirection === 'max' ? value <= target + margin : value >= target - margin;
  return nearTarget ? 'warning' : 'bad';
}

export const KPI_STATUS_STYLES = {
  good: 'text-emerald-700',
  warning: 'text-amber-700',
  bad: 'text-red-700',
  neutral: 'text-slate-400',
};

// Variante pastille (fond + texte), pour un badge à côté du nom du KPI plutôt qu'un simple
// texte coloré — même couleurs que KPI_STATUS_STYLES. Jamais 'neutral' (pas d'objectif ou pas
// encore de valeur) : rien à annoncer, voir KpiCard.jsx où ce badge n'est affiché que si
// StatusIcon est défini.
export const KPI_STATUS_BADGE_STYLES = {
  good: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  bad: 'bg-red-100 text-red-700',
};

export const KPI_STATUS_LABELS = {
  good: 'Objectif atteint',
  warning: 'Proche de l’objectif',
  bad: "Sous l'objectif",
  neutral: '',
};
