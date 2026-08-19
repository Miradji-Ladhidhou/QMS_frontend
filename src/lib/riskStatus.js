export const RISK_TYPE_LABELS = {
  risk: 'Risque',
  opportunity: 'Opportunité',
};

export const RISK_STATUS_LABELS = {
  identified: 'Identifié',
  treating: 'En traitement',
  treated: 'Traité',
  accepted: 'Accepté',
  closed: 'Clôturé',
};

export const RISK_STATUS_STYLES = {
  identified: 'bg-blue-100 text-blue-700',
  treating: 'bg-amber-100 text-amber-700',
  treated: 'bg-emerald-100 text-emerald-700',
  accepted: 'bg-slate-100 text-slate-700',
  closed: 'bg-slate-100 text-slate-700',
};

export const LIKELIHOOD_LABELS = { 1: 'Rare', 2: 'Peu probable', 3: 'Possible', 4: 'Probable', 5: 'Quasi certain' };
export const IMPACT_LABELS = { 1: 'Négligeable', 2: 'Mineur', 3: 'Modéré', 4: 'Majeur', 5: 'Critique' };

// Bandes d'une matrice 5x5 standard (score = probabilité × gravité, de 1 à 25).
export function riskLevel(score) {
  if (score === null || score === undefined) return null;
  if (score >= 16) return 'critical';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

export const RISK_LEVEL_LABELS = { low: 'Faible', medium: 'Modéré', high: 'Élevé', critical: 'Critique' };
export const RISK_LEVEL_STYLES = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
// Teintes pleines (fond de cellule de matrice), plus saturées que les badges texte ci-dessus.
export const RISK_LEVEL_CELL_STYLES = {
  low: 'bg-emerald-200',
  medium: 'bg-amber-200',
  high: 'bg-orange-300',
  critical: 'bg-red-300',
};
