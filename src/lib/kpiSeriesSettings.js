// Unité / objectif cible / sens de l'objectif d'une série (courbe) d'un KPI.
//
// Chaque série est soit « globale » (elle reprend kpi.unit / kpi.target / kpi.target_direction),
// soit « propre » : unité, cible et sens portés par la série elle-même
// (kpi_calculation_configs.unit/target/target_direction, renseignés ensemble — tout-ou-rien,
// imposé par l'API). Sens : 'min' = plancher (≥), 'max' = plafond (≤), comme kpis.target_direction
// (voir kpiStatus.js).

// Paramètres effectifs d'une série. `config` = une entrée de kpi.calculation_configs (ou null
// pour une valeur saisie hors série : elle suit le KPI).
export function resolveSeriesSettings(kpi, config) {
  if (config && config.target_direction) {
    return {
      unit: config.unit || '',
      target: config.target === null || config.target === undefined ? null : Number(config.target),
      direction: config.target_direction,
      custom: true,
    };
  }
  const hasTarget = kpi.target !== null && kpi.target !== undefined;
  return { unit: kpi.unit || '', target: hasTarget ? Number(kpi.target) : null, direction: kpi.target_direction || 'min', custom: false };
}

export function directionSymbol(direction) {
  return direction === 'max' ? '≤' : '≥';
}

// « ≥ 95 % » — vide si aucun objectif.
export function formatTarget({ target, direction, unit }) {
  if (target === null || target === undefined) return '';
  return `${directionSymbol(direction)} ${target}${unit ? ` ${unit}` : ''}`;
}

export const EMPTY_SERIES_SETTINGS_FORM = { mode: 'global', unit: '', target: '', direction: 'min' };

// Valeurs du formulaire d'une série existante (null/undefined = nouvelle série → global).
export function seriesSettingsToForm(config) {
  if (!config || !config.target_direction) return { ...EMPTY_SERIES_SETTINGS_FORM };
  return {
    mode: 'custom',
    unit: config.unit || '',
    target: config.target === null || config.target === undefined ? '' : String(config.target),
    direction: config.target_direction,
  };
}

// Message d'erreur (chaîne vide si valide) — en mode « propre », les trois champs sont requis.
export function validateSeriesSettingsForm(form) {
  if (form.mode !== 'custom') return '';
  if (!form.unit.trim()) return "Indiquez l'unité de mesure de cette série.";
  if (form.target === '' || !Number.isFinite(Number(form.target))) return "Indiquez l'objectif cible de cette série (un nombre).";
  if (form.direction !== 'min' && form.direction !== 'max') return "Indiquez le sens de l'objectif de cette série.";
  return '';
}

// Champs à envoyer à POST/PATCH /kpis/:id/series. Mode global → trois null explicites : ils
// remettent la série sur les valeurs du KPI si elle était propre avant (PATCH).
export function seriesSettingsPayload(form) {
  if (form.mode !== 'custom') return { unit: null, target: null, target_direction: null };
  return { unit: form.unit.trim(), target: Number(form.target), target_direction: form.direction };
}
