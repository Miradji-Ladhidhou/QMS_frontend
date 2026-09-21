// Indicateurs des modules : états, objectifs, comparaisons de périodes. Les valeurs, états et comparaisons viennent du
// serveur (GET /kpis/module-overview) ; ce module ne fait que les présenter.

export const STATUS_LABELS = { good: 'Sur objectif', warning: 'À surveiller', bad: 'Hors objectif', neutral: 'Sans objectif' };
export const STATUS_STYLES = {
  good: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-500',
};
// Couleur de la courbe selon l'état.
export const STATUS_COLORS = { good: '#059669', warning: '#d97706', bad: '#dc2626', neutral: '#64748b' };

// Comparer la valeur actuelle à… (clé = champ du serveur).
export const COMPARISON_MODES = [
  { key: 'previous', label: 'Période précédente', short: 'vs période précédente', empty: 'Pas encore de période précédente' },
  { key: 'year_ago', label: 'Même période l’an dernier', short: 'vs même période N-1', empty: 'Pas de donnée il y a un an' },
  { key: 'average_6', label: 'Moyenne des 6 précédentes', short: 'vs moyenne des 6 précédentes', empty: 'Pas assez d’historique' },
];

// « ≤ 5 CAPA », « ≥ 90 % ».
export function formatObjective(target, direction, unit) {
  if (target === null || target === undefined) return 'Aucun objectif';
  const label = unitFor(target, unit);
  return `${direction === 'max' ? '≤' : '≥'} ${formatNumber(target)}${label ? ` ${label}` : ''}`;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

// En français, 0 et 1 s'accordent au singulier : « 0 fournisseur », « 1 risque » (les sigles comme « CAPA » ou « NC » ne changent pas).
export function unitFor(value, unit) {
  if (!unit || value === null || value === undefined) return unit || '';
  return Math.abs(Number(value)) < 2 && /[a-zé]s$/.test(unit) ? unit.slice(0, -1) : unit;
}

export function formatValue(value, unit) {
  const label = unitFor(value, unit);
  return `${formatNumber(value)}${label ? ` ${label}` : ''}`;
}

// Phrase du sens de l'objectif, en clair.
export const DIRECTION_LABELS = { max: 'Ne pas dépasser', min: 'Atteindre au moins' };

// Écart entre la valeur actuelle et la valeur de comparaison. `better` : mieux, moins bien ou identique — selon le sens de
// l'objectif (pour un plafond, baisser est un progrès ; pour un plancher, monter). null sans valeur de comparaison.
export function compareValues(latest, baseline, direction) {
  if (!latest || !baseline) return null;
  const delta = Math.round((latest.value - baseline.value) * 100) / 100;
  const verdict = delta === 0 ? 'same' : (direction === 'max' ? delta < 0 : delta > 0) ? 'better' : 'worse';
  const percent = baseline.value !== 0 ? Math.round((delta / Math.abs(baseline.value)) * 100) : null;
  return { delta, percent, verdict };
}

export const VERDICT_LABELS = { better: 'amélioré', worse: 'dégradé', same: 'stable' };
export const VERDICT_STYLES = { better: 'text-emerald-700', worse: 'text-red-700', same: 'text-slate-500' };

// « +3 », « −2 » (vrai signe moins).
export function formatDelta(delta) {
  if (delta === 0) return '0';
  return `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))}`;
}

// Mois et année d'une date de période (yyyy-mm-dd) : « mai 2026 ».
export function formatPeriod(dateStr, frequency) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (frequency === 'quarterly') return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
