import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { QuotaMeter } from './AiQuotaBar.jsx';

export default function AiQuotaAlerts({ onOpenTenant }) {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const { data } = await api.get('/ai-quota/alerts');
        if (active) { setAlerts(data); setError(''); }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Impossible de charger les alertes de quota IA.');
      } finally { loading = false; }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('ai-quota-refresh', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('ai-quota-refresh', refresh); };
  }, []);
  return <section className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="text-sm font-semibold text-slate-900">Alertes quotas IA des entreprises</h3>
    <p className="text-xs text-slate-500">Seuils 80 % et 95 %, réservations en cours incluses. Renouvellement mensuel UTC.
      Les alertes globales Groq sont visibles dans « Système ».</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {!alerts && !error && <p className="text-xs text-slate-500">Chargement…</p>}
    {alerts?.length === 0 && !error && <p className="text-xs text-slate-500">Aucune entreprise au-dessus du seuil de 80 %.</p>}
    {!error && alerts?.map((item) => <div key={item.id} className="space-y-1">
      <QuotaMeter label={item.name} quota={{
        limit: item.limit, used: item.used, pending: item.pending, remaining: Math.max(0, item.limit - item.used - item.pending),
      }} />
      {onOpenTenant && <button type="button" onClick={() => onOpenTenant(item.id)} className="text-xs text-primary">Ouvrir la fiche de {item.name}</button>}
    </div>)}
  </section>;
}
