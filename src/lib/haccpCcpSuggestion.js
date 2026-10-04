import { suggestIntervalHours, suggestLimits } from './haccpMonitoring.js';

const PROCEDURE_FIELDS = [
  'critical_limits', 'monitoring_procedure', 'monitoring_frequency',
  'corrective_action_procedure', 'verification_procedure',
  'verification_frequency', 'record_keeping_procedure',
];

export function nextCcpNumber(steps = []) {
  const numbers = steps.flatMap((step) => step.hazards || [])
    .map((hazard) => /^CCP\s*(\d+)$/i.exec(hazard.ccp?.ccp_number || ''))
    .filter(Boolean).map((match) => Number(match[1]));
  return `CCP${Math.max(0, ...numbers) + 1}`;
}

export function suggestSingleCcpLimits(text = '') {
  // A single measurement cannot encode several criteria or strict inequalities.
  const comparisons = text.match(/≤|≥|<=|>=|[<>]/g) || [];
  const units = new Set([...text.matchAll(/-?\d+(?:[.,]\d+)?\s*(°\s?[CF]|%|ppm|mg\/kg|mg\/l|min|s|h|pH|bar)\b/gi)]
    .map((match) => match[1].replace(/\s/g, '').toLowerCase()));
  return comparisons.length <= 1 && units.size <= 1 && !/[<>](?!=)/.test(text) ? suggestLimits(text) : null;
}

export function suggestPrimaryCcpLimits(text = '') {
  const single = suggestSingleCcpLimits(text);
  if (single) return { ...single, partial: false };
  const firstCriterion = text.split(/[;\n]/)[0];
  if (!/temp[ée]rature/i.test(firstCriterion)) return null;
  const match = firstCriterion.match(/(?:≤|<=|≥|>=)\s*(-?\d+(?:[.,]\d+)?)\s*°\s*([CF])/i);
  if (!match) return null;
  if (/[≤≥<>]/.test(firstCriterion.slice(0, match.index))) return null;
  const remainder = firstCriterion.slice((match.index ?? 0) + match[0].length);
  if (/[≤≥<>]/.test(remainder)) return null;
  const maximum = /^(?:≤|<=)/.test(match[0]);
  const value = Number(match[1].replace(',', '.'));
  return { min: maximum ? null : value, max: maximum ? value : null, unit: `°${match[2].toUpperCase()}`, partial: true };
}

export function applyCcpSuggestion(form, suggestion, ccpNumber) {
  const next = { ...form, ai_generated: true, ccp_number: form.ccp_number || ccpNumber };
  for (const field of PROCEDURE_FIELDS) {
    if (typeof suggestion[field] === 'string' && suggestion[field].trim()) next[field] = suggestion[field];
  }
  const limits = suggestPrimaryCcpLimits(next.critical_limits);
  next.limit_min = limits?.min == null ? '' : String(limits.min);
  next.limit_max = limits?.max == null ? '' : String(limits.max);
  next.limit_unit = limits?.unit || '';
  const interval = suggestIntervalHours(next.monitoring_frequency);
  next.monitoring_interval_hours = interval > 0 && interval <= 8760 ? String(interval) : '';
  return next;
}

export function ccpSuggestionGuidance(suggestion, form) {
  const source = suggestion?.validation_source_guidance;
  const evidence = suggestion?.validation_evidence_guidance;
  return {
    source: typeof source === 'string' && source.trim() ? source :
      `Consultez le texte réglementaire, le GBPH applicable au produit ou une étude validée correspondant à ces limites : ${form.critical_limits || 'limites critiques à préciser'}. Notez la référence exacte, la version et la page réellement consultées.`,
    evidence: typeof evidence === 'string' && evidence.trim() ? evidence :
      `Réunissez les résultats réels démontrant l'efficacité des mesures de maîtrise pour ce produit et ce procédé. Vérification proposée : ${form.verification_procedure || 'à préciser'}. Identifiez les rapports, lots, dates et instruments utilisés ; ne déclarez pas un essai non réalisé.`,
  };
}
