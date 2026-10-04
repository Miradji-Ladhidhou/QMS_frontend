import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { QuotaMeter } from './AiQuotaBar.jsx';

const FIELDS = [
  ['requests_minute', 'Requêtes / minute (RPM)'],
  ['requests_day', 'Requêtes / jour (RPD)'],
  ['tokens_minute', 'Tokens / minute (TPM)'],
  ['tokens_day', 'Tokens / jour (TPD)'],
];

export default function GroqQuotaSettings() {
  const [quota, setQuota] = useState(null);
  const [values, setValues] = useState(null);
  const [error, setError] = useState('');
  const [snapshotError, setSnapshotError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    setSnapshotError('');
    try {
      const { data } = await api.get('/ai-quota/groq');
      setQuota(data);
      setValues(Object.fromEntries(FIELDS.map(([key]) => [key, data.limits[key] === null ? '' : String(data.limits[key])])));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger les plafonds Groq.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    let loadingSnapshot = false;
    async function refresh() {
      if (loadingSnapshot) return;
      loadingSnapshot = true;
      try {
        const { data } = await api.get('/ai-quota/groq');
        if (active) {
          setQuota(data);
          setValues((previous) => previous || Object.fromEntries(FIELDS.map(([key]) => [key, data.limits[key] === null ? '' : String(data.limits[key])])));
          setError('');
        }
      } catch (err) {
        if (active) setSnapshotError(err.response?.data?.error || 'Impossible de charger les plafonds Groq.');
      } finally {
        loadingSnapshot = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  async function save(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const { data } = await api.patch('/ai-quota/groq', Object.fromEntries(
        FIELDS.map(([key]) => [key, values[key] === '' ? null : Number(values[key])]),
      ));
      setQuota(data);
      setMessage('Plafonds enregistrés. Les compteurs existants sont conservés.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier les plafonds Groq.');
    } finally {
      setSaving(false);
    }
  }
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-900">Plafonds globaux Groq</h3>
      <button type="button" onClick={load} disabled={loading || saving} className="text-xs font-medium text-primary disabled:opacity-50">
        {loading ? 'Actualisation…' : 'Actualiser les compteurs et réglages'}
      </button>
    </div>
    <p className="text-xs text-slate-600">
      Consultez <a href="https://console.groq.com/settings/limits" target="_blank" rel="noopener noreferrer" className="underline">Groq → Limits</a> pour
      votre organisation et le modèle {quota?.model || 'configuré'}, puis saisissez des plafonds égaux ou inférieurs.
      La clé API n’est ni affichée ni nécessaire ici.
    </p>
    <p className="text-xs text-slate-500">
      Garde-fou local QMS, pas le solde réel de votre compte Groq. Les fenêtres sont glissantes : 60 secondes et 24 heures.
      Les budgets de sortie et une estimation prudente de l’entrée sont réservés avant chaque appel, puis remplacés par les tokens déclarés par Groq.
      Les reprises comptent chacune une requête. Les erreurs sans consommation connue conservent le budget estimé.
      D’autres applications, les limites séparées entrée/sortie ou un changement des limites Groq peuvent encore provoquer un refus fournisseur.
      Pour votre offre gpt-oss-120b : 30 RPM, 1 000 RPD, 8 000 TPM et 200 000 TPD.
      QMS ajuste le budget de sortie à la place disponible après le prompt et attend au plus 65 secondes si la fenêtre minute est pleine.
    </p>
    <p className="text-xs text-slate-500">Alertes à 80 % et 95 %. Compteurs actualisés toutes les 30 secondes sans écraser vos saisies.
      Les limites Groq se libèrent progressivement après 60 secondes ou 24 heures, pas au renouvellement mensuel des actions.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {snapshotError && <p role="alert" className="text-sm text-red-700">{snapshotError}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {!quota && !error && !snapshotError && <p className="text-xs text-slate-500">Chargement…</p>}
    {quota && values && <form onSubmit={save} className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(([key, label]) => <div key={key} className="space-y-2">
          <QuotaMeter label={label} quota={{
            limit: quota.limits[key], used: quota.usage[key], pending: 0,
            remaining: quota.limits[key] === null ? null : Math.max(0, quota.limits[key] - quota.usage[key]),
          }} />
          <label className="block text-xs text-slate-600">
            Plafond : {label}
            <input aria-label={`Plafond ${label}`} type="number" min="0" max="1000000000" step="1" value={values[key]}
              onChange={(event) => setValues((previous) => ({ ...previous, [key]: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </label>
        </div>)}
      </div>
      <p className="text-xs text-slate-500">Vide = garde-fou désactivé pour cette limite ; 0 = aucun appel autorisé. Un appel peut être refusé avant 100 % si son budget réservé ne tient plus dans le plafond.</p>
      <p className="text-xs text-slate-500">{quota.usage.pending} appel(s) en cours ou réservation(s) non finalisée(s) ; {quota.usage.estimated_calls} appel(s) avec consommation estimée sur 24 h.</p>
      <button disabled={saving || loading} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">
        {saving ? 'Enregistrement…' : 'Enregistrer les plafonds'}
      </button>
    </form>}
  </section>;
}
