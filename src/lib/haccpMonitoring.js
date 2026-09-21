// Surveillance des points critiques (CCP) : états, libellés, limites chiffrées et aides de saisie.
// Miroir côté écran des règles du serveur (services/haccpMonitoring.js) — le serveur reste seul juge du verdict.

export const MONITORING_STATE_LABELS = {
  overdue: 'Relevé en retard',
  due_soon: 'Relevé bientôt dû',
  ok: 'À jour',
  no_schedule: 'Sans rappel',
};

export const MONITORING_STATE_STYLES = {
  overdue: 'bg-red-100 text-red-700',
  due_soon: 'bg-amber-100 text-amber-800',
  ok: 'bg-emerald-100 text-emerald-700',
  no_schedule: 'bg-slate-100 text-slate-500',
};

// Ordre d'urgence (le plus urgent d'abord), pour trier ou repérer le pire état d'un ensemble de CCP.
export const MONITORING_STATE_RANK = { overdue: 0, due_soon: 1, ok: 2, no_schedule: 3 };

// « ≥ 0 °C et ≤ 4 °C », « ≤ 4 °C », « ≥ 63 °C » — vide sans borne.
export function formatLimits(limits) {
  if (!limits) return '';
  const unit = limits.unit ? ` ${limits.unit}` : '';
  const parts = [];
  if (limits.min !== null && limits.min !== undefined) parts.push(`≥ ${limits.min}${unit}`);
  if (limits.max !== null && limits.max !== undefined) parts.push(`≤ ${limits.max}${unit}`);
  return parts.join(' et ');
}

// Nombre saisi à la française (« 3,5 ») ou à l'anglaise ; null si ce n'est pas un nombre.
export function parseNumber(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

// Verdict prévisionnel affiché pendant la saisie (bornes incluses) ; null tant que la valeur n'est pas un nombre.
export function previewVerdict(raw, limits) {
  const value = parseNumber(raw);
  if (value === null || !limits) return null;
  if (limits.min !== null && limits.min !== undefined && value < limits.min) return false;
  if (limits.max !== null && limits.max !== undefined && value > limits.max) return false;
  return true;
}

// Bornes proposées d'après le texte des limites critiques (« < 4 °C », « ≥ 63 °C », « entre 0 et 4 °C »).
// Une simple suggestion à valider : jamais appliquée sans que la personne la voie.
export function suggestLimits(text) {
  if (!text) return null;
  const source = text.replace(/,/g, '.');
  const number = '(-?\\d+(?:\\.\\d+)?)';
  const unitMatch = source.match(/-?\d+(?:\.\d+)?\s*(°\s?[CF]|%|ppm|mg\/kg|mg\/l|min|s|h|pH|bar)/i);
  const unit = unitMatch ? unitMatch[1].replace(/\s/g, '') : '';

  const between = source.match(new RegExp(`(?:entre|de)\\s*${number}\\s*(?:°\\s?[CF])?\\s*(?:et|à|-|–)\\s*${number}`, 'i'));
  if (between) return { min: Number(between[1]), max: Number(between[2]), unit };
  const max = source.match(new RegExp(`(?:≤|<=|<|max(?:imum)?\\.?|inférieur(?:e)?\\s+(?:ou égale?\\s+)?à|au plus)\\s*${number}`, 'i'));
  const min = source.match(new RegExp(`(?:≥|>=|>|min(?:imum)?\\.?|supérieur(?:e)?\\s+(?:ou égale?\\s+)?à|au moins)\\s*${number}`, 'i'));
  if (!min && !max) return null;
  return { min: min ? Number(min[1]) : null, max: max ? Number(max[1]) : null, unit };
}

// Intervalle de rappel (en heures) proposé d'après la fréquence saisie en texte libre (« 2 fois par jour »,
// « toutes les 4 heures », « quotidien », « hebdomadaire »). null pour « en continu », « par lot »… (pas de rappel).
export function suggestIntervalHours(text) {
  if (!text) return null;
  const value = text.toLowerCase();
  const perDay = value.match(/(\d+)\s*(?:fois|x|relev[ée]s?)\s*(?:par|\/)\s*jour/);
  if (perDay && Number(perDay[1]) > 0) return Math.round((24 / Number(perDay[1])) * 10) / 10;
  const every = value.match(/toutes?\s+les\s+(\d+(?:[.,]\d+)?)\s*(h|heures?|min|minutes?)/);
  if (every) {
    const amount = Number(every[1].replace(',', '.'));
    return /^min/.test(every[2]) ? Math.round((amount / 60) * 100) / 100 : amount;
  }
  if (/quotidien|chaque jour|journalier|1\s*fois\s*par\s*jour|une\s*fois\s*par\s*jour/.test(value)) return 24;
  if (/hebdo|chaque semaine|une\s*fois\s*par\s*semaine/.test(value)) return 168;
  if (/mensuel|chaque mois/.test(value)) return 720;
  return null;
}

// « 12 h », « 1,5 h », « 30 min ».
export function formatInterval(hours) {
  if (hours === null || hours === undefined) return '';
  const value = Number(hours);
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${String(value).replace('.', ',')} h`;
}

// « en retard de 5 h », « à faire avant 14:30 », « à faire demain 08:00 ».
export function describeDue(item) {
  if (item.monitoring_state === 'no_schedule') return 'Aucun rappel programmé';
  if (item.monitoring_state === 'overdue') {
    const hours = Number(item.overdue_hours || 0);
    return hours < 1 ? 'En retard de moins d’une heure' : `En retard de ${Math.round(hours)} h`;
  }
  if (!item.due_at) return '';
  const due = new Date(item.due_at);
  const sameDay = due.toDateString() === new Date().toDateString();
  const time = due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `À faire avant ${time}` : `À faire le ${due.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${time}`;
}
