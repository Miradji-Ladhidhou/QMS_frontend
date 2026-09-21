// Évaluation des fournisseurs : critères, note pondérée, décision proposée, états d'évaluation et de certificat.
// Miroir côté écran de backend/src/services/supplierPolicy.js — le serveur reste seul juge (il recalcule tout).

export const CRITERIA = [
  { key: 'quality', scoreKey: 'quality_score', label: 'Qualité' },
  { key: 'delivery', scoreKey: 'delivery_score', label: 'Délais' },
  { key: 'price', scoreKey: 'price_score', label: 'Prix' },
  { key: 'responsiveness', scoreKey: 'responsiveness_score', label: 'Réactivité' },
];

export const CRITICALITIES = [
  { key: 'low', label: 'Faible' },
  { key: 'medium', label: 'Moyenne' },
  { key: 'high', label: 'Élevée' },
  { key: 'critical', label: 'Critique' },
];

export const DECISION_SEVERITY = { maintained: 0, under_watch: 1, to_replace: 2 };

const round2 = (value) => Math.round(value * 100) / 100;

// Note globale pondérée (1 à 5, deux décimales) ; `scores` = { quality, delivery, price, responsiveness }.
export function weightedScore(scores, weights) {
  const total = CRITERIA.reduce((sum, { key }) => sum + Number(weights[key]), 0);
  if (total <= 0) return null;
  return round2(CRITERIA.reduce((sum, { key }) => sum + Number(scores[key]) * Number(weights[key]), 0) / total);
}

// Décision proposée d'après la note : strictement sous « à remplacer », puis strictement sous « sous surveillance ».
export function suggestDecision(score, thresholds) {
  if (score < thresholds.replace) return 'to_replace';
  if (score < thresholds.watch) return 'under_watch';
  return 'maintained';
}

export const isMoreLenient = (decision, suggested) => DECISION_SEVERITY[decision] < DECISION_SEVERITY[suggested];

// « qualité ×3 · délais ×2 · prix ×1 · réactivité ×1 ».
export function describeWeights(weights) {
  if (!weights) return 'poids égaux';
  return CRITERIA.map(({ key, label }) => `${label.toLowerCase()} ×${weights[key]}`).join(' · ');
}

export const EVALUATION_STATE_LABELS = { never: 'Jamais évalué', overdue: 'Évaluation en retard', due_soon: 'Évaluation à prévoir', ok: 'À jour' };
export const EVALUATION_STATE_STYLES = {
  never: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-700',
  due_soon: 'bg-amber-100 text-amber-800',
  ok: 'bg-emerald-100 text-emerald-700',
};

export const DOCUMENT_KIND_LABELS = {
  quality_certificate: 'Certificat qualité (ISO 9001…)',
  food_safety_certificate: 'Certificat sécurité des aliments (ISO 22000, IFS, BRC…)',
  sanitary_approval: 'Agrément sanitaire',
  insurance: 'Assurance',
  contract: 'Contrat',
  other: 'Autre',
};

export const DOCUMENT_STATE_LABELS = { valid: 'Valide', expiring: 'Expire bientôt', expired: 'Expiré', no_expiry: 'Sans échéance' };
export const DOCUMENT_STATE_STYLES = {
  valid: 'bg-emerald-100 text-emerald-700',
  expiring: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-700',
  no_expiry: 'bg-slate-100 text-slate-500',
};

export function formatIsoDate(dateStr) {
  return dateStr ? new Date(`${String(dateStr).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR') : '—';
}

// Note sur 5 avec une virgule française : « 3,43/5 ».
export const formatScore = (score) => (score === null || score === undefined ? '—' : `${Number(score).toFixed(2).replace('.', ',')}/5`);

// Réglages de l'entreprise par défaut (miroir du serveur) : sert de base au formulaire tant que rien n'est chargé.
export const DEFAULT_SETTINGS = {
  frequency_months: { low: 24, medium: 12, high: 9, critical: 6 },
  thresholds: { watch: 3, replace: 2 },
  weights: Object.fromEntries(CRITICALITIES.map(({ key }) => [key, { quality: 1, delivery: 1, price: 1, responsiveness: 1 }])),
  auto_suspend_on_replace: true,
};
