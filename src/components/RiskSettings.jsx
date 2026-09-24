import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';

export default function RiskSettings() {
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/risks/settings')
      .then(({ data }) => setThreshold(String(data.unacceptable_score)))
      .catch(() => setError('Impossible de charger le seuil des risques.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.patch('/risks/settings', { unacceptable_score: Number(threshold) });
      setThreshold(String(data.unacceptable_score));
      setMessage('Seuil enregistré.');
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le seuil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Seuil d'acceptabilité des risques</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Un risque dont le score résiduel atteint ce seuil est considéré comme inacceptable. Une CAPA liée est alors exigée
        avant son traitement, son acceptation ou sa clôture.
      </p>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="max-w-xs flex-1">
          <label htmlFor="settings-risk-threshold" className="mb-1 block text-sm font-medium text-slate-700">
            Score minimal (2 à 25)
          </label>
          <input
            id="settings-risk-threshold"
            type="number"
            min="2"
            max="25"
            required
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
          <Save size={16} />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
