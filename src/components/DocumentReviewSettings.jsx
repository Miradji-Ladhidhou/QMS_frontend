import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../lib/api.js';

// Même principe que CapaDelaysSettings.jsx (un délai paramétrable par tenant), mais une seule
// valeur ici plutôt qu'une par niveau — la fréquence de révision documentaire ne varie pas par
// gravité, contrairement au traitement d'une CAPA. Stockée sur tenants (voir GET/PATCH /tenant)
// plutôt qu'une table dédiée, puisque c'est un scalaire unique.
export default function DocumentReviewSettings() {
  const [months, setMonths] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [backfilledCount, setBackfilledCount] = useState(0);

  useEffect(() => {
    api
      .get('/tenant')
      .then(({ data }) => setMonths(data.document_review_frequency_months || ''))
      .catch(() => setError('Impossible de charger le paramétrage.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      const { data } = await api.patch('/tenant', { document_review_frequency_months: months || null });
      setMonths(data.document_review_frequency_months || '');
      setBackfilledCount(data.backfilled_review_dates_count || 0);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’enregistrer le paramétrage.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Révision documentaire</h2>
      <p className="mt-1 text-xs text-slate-500 sm:text-sm">
        Fréquence par défaut, en mois, à laquelle un document doit être révisé. Enregistrer ici recalcule
        immédiatement la prochaine révision de tous les documents qui n'ont pas leur propre fréquence — ajustable
        pour un document précis depuis sa fiche, ce qui le protège de ce défaut.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {saved && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Paramétrage enregistré.
          {backfilledCount > 0 &&
            ` Prochaine révision recalculée pour ${backfilledCount} document${backfilledCount > 1 ? 's' : ''} (sans fréquence propre).`}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="max-w-xs flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence par défaut</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="Laisser vide pour désactiver"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <span className="shrink-0 text-sm text-slate-500">mois</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
