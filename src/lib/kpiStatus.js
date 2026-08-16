export function getKpiStatus(lastValue, target, targetDirection = 'min') {
  if (lastValue === null || lastValue === undefined || target === null || target === undefined) {
    return 'neutral';
  }
  const meetsTarget = targetDirection === 'max' ? lastValue <= target : lastValue >= target;
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
