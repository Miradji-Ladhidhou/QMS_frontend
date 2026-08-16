import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../lib/api.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';

const LEVELS = Object.keys(CAPA_PRIORITY_LABELS);

export default function CapaDelaysSettings() {
  const [delays, setDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get('/capas/priority-delays')
      .then(({ data }) => setDelays(data))
      .catch(() => setError('Impossible de charger les délais de traitement.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      const { data } = await api.put('/capas/priority-delays', delays);
      setDelays(data);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’enregistrer les délais de traitement.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Délais de traitement des CAPA</h2>
      <p className="mt-1 text-xs text-slate-500 sm:text-sm">
        Nombre de jours après la création pour suggérer l'échéance, selon la gravité.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {saved && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Délais enregistrés.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LEVELS.map((level) => (
          <div key={level}>
            <label className="mb-1 block text-sm font-medium text-slate-700">{CAPA_PRIORITY_LABELS[level]}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                required
                value={delays[level]}
                onChange={(e) => setDelays((prev) => ({ ...prev, [level]: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <span className="shrink-0 text-sm text-slate-500">jours</span>
            </div>
          </div>
        ))}

        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
