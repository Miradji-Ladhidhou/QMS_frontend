// Texte prérempli d'un risque proposé à partir d'un KPI hors objectif.
// suggestion : { kpi_id, name, off_target_series: [{ label, average, unit, target, direction }] }

const seriesText = (series, showLabel) => {
  const unit = series.unit ? ` ${series.unit}` : '';
  const label = showLabel ? `${series.label} : ` : '';
  return `${label}${series.average}${unit} (objectif ${series.direction === 'max' ? '≤' : '≥'} ${series.target}${unit})`;
};

export function describeOffTargetSeries(suggestion) {
  const many = suggestion.off_target_series.length > 1 || suggestion.off_target_series[0].label !== 'Valeur';
  return suggestion.off_target_series.map((series) => seriesText(series, many));
}

export function riskDraftFromKpi(suggestion) {
  return {
    title: `KPI hors objectif : ${suggestion.name}`,
    description: `L'indicateur « ${suggestion.name} » n'atteint pas son objectif sur les derniers relevés — ${describeOffTargetSeries(suggestion).join(' ; ')}. Quel risque pour l'activité, et quelle maîtrise mettre en place ?`,
    category: 'Performance',
  };
}
