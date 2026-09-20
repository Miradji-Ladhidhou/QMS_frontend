// Aides communes à la revue des risques (vue « à revoir », fiche d'un risque).

const DAY_MS = 86400000;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Nombre de jours entre aujourd'hui et une date yyyy-mm-dd (négatif = dépassée).
export function daysUntil(dateStr) {
  return Math.round((new Date(`${dateStr}T00:00:00Z`) - new Date(`${todayIso()}T00:00:00Z`)) / DAY_MS);
}

// « En retard de 12 jours », « Dans 5 jours », « Aujourd'hui », « Revue non planifiée ».
export function describeReviewDate(reviewDate) {
  if (!reviewDate) return 'Revue non planifiée';
  const days = daysUntil(reviewDate);
  if (days < 0) return `En retard de ${-days} jour${-days > 1 ? 's' : ''}`;
  if (days === 0) return "Aujourd'hui";
  return `Dans ${days} jour${days > 1 ? 's' : ''}`;
}

export const REVIEW_STATE_STYLES = {
  overdue: 'bg-red-100 text-red-700',
  soon: 'bg-amber-100 text-amber-700',
  unplanned: 'bg-slate-100 text-slate-600',
};

// Date yyyy-mm-dd dans `months` mois (jour ramené au dernier jour du mois cible si besoin : 31 janvier + 1 mois = 28 février).
export function addMonthsIso(months) {
  const date = new Date();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export const NEXT_REVIEW_OPTIONS = [
  { months: 3, label: 'Dans 3 mois' },
  { months: 6, label: 'Dans 6 mois' },
  { months: 12, label: 'Dans 12 mois' },
  { months: 24, label: 'Dans 24 mois' },
];

// « 15/03/2027 » à partir d'une date yyyy-mm-dd (lue à midi : jamais décalée d'un jour par le fuseau).
export function formatIsoDate(dateStr) {
  return dateStr ? new Date(`${dateStr}T12:00:00`).toLocaleDateString('fr-FR') : '—';
}
