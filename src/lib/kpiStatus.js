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

export const KPI_STATUS_LABELS = {
  good: 'Objectif atteint',
  bad: "Sous l'objectif",
  neutral: '',
};
