import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { AiLimitInput } from './AiPlanSettings.jsx';
import AiQuotaSettings from './AiQuotaSettings.jsx';
import AiModuleSettings from './AiModuleSettings.jsx';
import AiUsageDashboard from './AiUsageDashboard.jsx';

export default function AiCompanySettings({ tenantId, onPlanApplied }) {
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState('');
  const [defaultLimit, setDefaultLimit] = useState('');
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const savedDefaultLimit = settings?.ai_default_user_limit;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [company, templates] = await Promise.all([
          api.get(`/ai-quota/tenants/${tenantId}/commercial`), api.get('/ai-quota/plans'),
        ]);
        if (active) {
          setSettings(company.data); setPlans(templates.data);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Impossible de charger le forfait IA de l’entreprise.');
      }
    }
    load();
    const refresh = (event) => { if (event.detail?.tenantId === tenantId) load(); };
    window.addEventListener('ai-settings-updated', refresh);
    return () => { active = false; window.removeEventListener('ai-settings-updated', refresh); };
  }, [tenantId, revision]);
  useEffect(() => {
    if (savedDefaultLimit !== undefined) setDefaultLimit(savedDefaultLimit === null ? '' : String(savedDefaultLimit));
  }, [tenantId, savedDefaultLimit]);
  async function save(applyPlan) {
    if (applyPlan && !window.confirm('Appliquer ce forfait remplace les accès IA, le quota entreprise et le quota par défaut des nouveaux salariés. Les quotas individuels existants et la consommation sont conservés. Continuer ?')) return;
    setSaving(true); setError(''); setMessage('');
    try {
      if (applyPlan) {
        const { data } = await api.post(`/ai-quota/tenants/${tenantId}/plan`, { key: selected });
        setSettings(data);
        setDefaultLimit(data.ai_default_user_limit === null ? '' : String(data.ai_default_user_limit));
        setRevision((previous) => previous + 1);
        window.dispatchEvent(new Event('tenant-refresh'));
        window.dispatchEvent(new Event('ai-quota-refresh'));
        setMessage('Forfait appliqué. Consommation et quotas des salariés existants conservés.');
        onPlanApplied?.(data);
      } else {
        const { data } = await api.patch(`/ai-quota/tenants/${tenantId}/default-user-limit`, {
          limit: defaultLimit === '' ? null : Number(defaultLimit),
        });
        setSettings(data);
        setMessage('Quota par défaut enregistré pour les futurs comptes.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier les réglages IA.');
    } finally { setSaving(false); }
  }
  const basePlan = plans.find((plan) => plan.key === settings?.ai_plan_key);
  const customized = basePlan && (settings.ai_monthly_limit !== basePlan.monthly_limit ||
    settings.ai_default_user_limit !== basePlan.default_user_limit ||
    Object.keys(basePlan.modules).some((key) => settings.ai_modules[key] !== basePlan.modules[key]));
  return <section className="space-y-4">
    <h3 className="text-sm font-semibold text-slate-900">Forfait et accès</h3>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    {!settings && !error && <p className="text-xs text-slate-500">Chargement…</p>}
    {settings && <>
      <p className="text-xs text-slate-600">Base : {basePlan?.name || 'Configuration manuelle'}{customized ? ' · personnalisée ou modèle modifié depuis attribution' : ''}.
        Le modèle n’est jamais synchronisé automatiquement.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-xs">Forfait
          <select aria-label="Forfait de l’entreprise" value={selected} onChange={(event) => setSelected(event.target.value)}
            disabled={saving} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5">
            <option value="">Choisir un forfait configuré</option>
            {plans.filter((plan) => plan.configured).map((plan) => <option key={plan.key} value={plan.key}>{plan.name}</option>)}
          </select>
        </label>
        <button type="button" disabled={saving || !selected} onClick={() => save(true)}
          className="rounded-md bg-primary px-3 py-2 text-xs text-white disabled:opacity-50">Appliquer le forfait</button>
      </div>
      {!plans.some((plan) => plan.configured) && <p className="text-xs text-amber-700">Configurez d’abord les modèles dans l’onglet « Forfaits ».</p>}
      <form onSubmit={(event) => { event.preventDefault(); save(false); }} className="space-y-2 rounded-md border border-slate-200 p-3">
        <AiLimitInput label="Quota mensuel par défaut des nouveaux salariés" value={defaultLimit} onChange={setDefaultLimit} disabled={saving} />
        <p className="text-xs text-slate-500">Copié lors de la création d’un compte, quel que soit son mode de création.
          Les comptes existants restent inchangés. Leurs exceptions se règlent ci-dessous. Ce quota ne réserve pas de part du quota entreprise.</p>
        <button disabled={saving} className="rounded-md bg-primary px-3 py-2 text-xs text-white disabled:opacity-50">Enregistrer le quota par défaut</button>
      </form>
    </>}
    <AiQuotaSettings key={`quota:${revision}`} tenantId={tenantId} />
    <AiModuleSettings key={`modules:${revision}`} tenantId={tenantId} />
    <AiUsageDashboard tenantId={tenantId} />
  </section>;
}
