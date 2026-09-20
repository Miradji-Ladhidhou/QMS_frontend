import { useEffect, useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { api } from '../../lib/api.js';

function formatDate(value) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR') : '';
}

// Planification des revues (§9.3.1 « à intervalles planifiés ») : fréquence choisie par l'admin, date attendue de la
// prochaine revue et rappel si elle n'est pas programmée. Le même rappel figure dans le planning.
export default function ReviewScheduleBanner({ isAdmin, refreshKey }) {
  const [schedule, setSchedule] = useState(null);
  const [months, setMonths] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api
      .get('/management-reviews/schedule')
      .then(({ data }) => {
        setSchedule(data);
        setMonths(data.frequency_months ? String(data.frequency_months) : '');
      })
      .catch(() => setSchedule(null));
  }

  useEffect(load, [refreshKey]);

  async function save(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch('/tenant', { management_review_frequency_months: months ? Number(months) : null });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la fréquence.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(false);
    load();
  }

  if (!schedule) return null;

  const tone = {
    overdue: 'border-red-200 bg-red-50 text-red-800',
    due_soon: 'border-amber-200 bg-amber-50 text-amber-800',
  }[schedule.status] || 'border-slate-200 bg-white text-slate-700';

  const message = {
    not_configured: 'Aucune fréquence de revue définie.',
    no_review: `Une revue tous les ${schedule.frequency_months} mois — aucune revue clôturée pour l'instant.`,
    scheduled: schedule.scheduled_review ? `Prochaine revue programmée le ${formatDate(schedule.scheduled_review.review_date)} : ${schedule.scheduled_review.title}.` : 'Prochaine revue programmée.',
    ok: `Prochaine revue à programmer avant le ${formatDate(schedule.next_due_date)}.`,
    due_soon: `Revue à programmer avant le ${formatDate(schedule.next_due_date)}.`,
    overdue: `Revue en retard : elle était attendue avant le ${formatDate(schedule.next_due_date)} et aucune n'est programmée.`,
  }[schedule.status];

  return (
    <div className={`mt-3 rounded-lg border px-3 py-2.5 text-sm ${tone}`}>
      <div className="flex items-start gap-2.5">
        <CalendarClock size={16} className="mt-0.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-x-3 sm:flex-row sm:items-center">
          <span className="min-w-0 flex-1">
            {message}
            {schedule.frequency_months && schedule.status !== 'no_review' ? ` (tous les ${schedule.frequency_months} mois)` : ''}
          </span>
          {isAdmin && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="-ml-1 flex min-h-[40px] shrink-0 items-center self-start px-1 text-xs font-medium underline sm:min-h-0 sm:self-auto"
            >
              {schedule.frequency_months ? 'Modifier la fréquence' : 'Définir la fréquence'}
            </button>
          )}
        </div>
      </div>
      {isAdmin && editing && (
        <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-xs">Une revue tous les</label>
          <input
            type="number"
            min="1"
            max="60"
            inputMode="numeric"
            placeholder="12"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs">mois</span>
          <button type="submit" disabled={saving} className="flex min-h-[40px] items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60">
            <Save size={12} />
            Enregistrer
          </button>
          <button type="button" onClick={() => setEditing(false)} className="min-h-[40px] px-2 text-xs underline">
            Annuler
          </button>
          <span className="w-full text-xs opacity-70">Laissez vide pour désactiver le rappel. Le rappel apparaît aussi dans le planning.</span>
          {error && <span className="w-full text-xs text-red-700">{error}</span>}
        </form>
      )}
    </div>
  );
}
