import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { AiModuleFields } from '../lib/aiModules.jsx';
import { AppModuleFields } from '../lib/appModules.jsx';

export function AiLimitInput({ label, value, onChange, disabled }) {
  return <label className="block text-xs text-slate-600">
    {label} (vide = illimité ; 0 = bloqué)
    <input aria-label={label} type="number" min="0" max="1000000" step="1" value={value}
      disabled={disabled} onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5" />
  </label>;
}

function PlanForm({ plan, onSaved }) {
  const [monthly, setMonthly] = useState(plan.monthly_limit === null ? '' : String(plan.monthly_limit));
  const [employee, setEmployee] = useState(plan.default_user_limit === null ? '' : String(plan.default_user_limit));
  const [modules, setModules] = useState(plan.modules);
  const [appModules, setAppModules] = useState(plan.app_modules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const { data } = await api.patch(`/ai-quota/plans/${plan.key}`, {
        monthly_limit: monthly === '' ? null : Number(monthly),
        default_user_limit: employee === '' ? null : Number(employee), modules, app_modules: appModules,
      });
      onSaved(data);
      setMessage('Forfait enregistré. Les entreprises déjà configurées restent inchangées.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d’enregistrer le forfait.');
    } finally { setSaving(false); }
  }
  return <form onSubmit={save} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="font-semibold text-slate-900">{plan.name}</h3>
    {!plan.configured && <p className="text-xs text-amber-700">À configurer avant attribution. Aucun quota commercial n’est prédéfini.</p>}
    <AiLimitInput label={`Quota entreprise ${plan.name}`} value={monthly} onChange={setMonthly} disabled={saving} />
    <AiLimitInput label={`Quota nouveau salarié ${plan.name}`} value={employee} onChange={setEmployee} disabled={saving} />
    <h4 className="border-t border-slate-200 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Modules métier inclus</h4>
    <AppModuleFields settings={appModules} onChange={setAppModules} disabled={saving} />
    <h4 className="border-t border-slate-200 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Assistance IA incluse</h4>
    <AiModuleFields settings={modules} onChange={setModules} disabled={saving} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    <button disabled={saving} className="rounded-md bg-primary px-3 py-2 text-sm text-white disabled:opacity-50">
      {saving ? 'Enregistrement…' : `Enregistrer ${plan.name}`}
    </button>
  </form>;
}

export default function AiPlanSettings() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/ai-quota/plans').then(({ data }) => { if (active) setPlans(data); })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Impossible de charger les forfaits.'); });
    return () => { active = false; };
  }, []);
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold text-slate-900">Forfaits</h2>
    <p className="text-sm text-slate-600">Configurez Essentiel, Pro et Premium, puis appliquez un forfait depuis une fiche entreprise.
      Un seul forfait pilote la classification commerciale, les modules métier et les accès IA. Les anciens plans sont conservés uniquement pour historique.
      Leur modification ne change aucune entreprise automatiquement. Aucune facturation n’est déclenchée.
      Après attribution, chaque accès et quota reste personnalisable. Réappliquer un forfait remplace ces personnalisations,
      sans remettre la consommation à zéro ni modifier les quotas des salariés existants.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!plans && !error && <p className="text-sm text-slate-500">Chargement…</p>}
    {plans && <div className="grid gap-4 lg:grid-cols-3">{plans.map((plan) => <PlanForm key={plan.key} plan={plan}
      onSaved={(updated) => setPlans((previous) => previous.map((item) => item.key === updated.key ? updated : item))} />)}</div>}
  </section>;
}
