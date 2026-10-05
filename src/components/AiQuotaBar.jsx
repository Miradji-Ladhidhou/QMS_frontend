import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { quotaProgress, quotaWarning } from '../lib/aiQuota.js';

export function QuotaMeter({ label, quota }) {
  const progress = quotaProgress(quota);
  const reached = quota.remaining === 0;
  const warning = quotaWarning(quota);
  const usage = quota.limit === null
    ? `${quota.used} action${quota.used > 1 ? 's' : ''} utilisée${quota.used > 1 ? 's' : ''} · sans plafond`
    : `${quota.used} / ${quota.limit} utilisée${quota.used > 1 ? 's' : ''}`;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs">
        <span className="font-medium">{label}</span>
        <span>{usage}{quota.pending > 0 ? ` (+${quota.pending} en cours)` : ''}</span>
      </div>
      {progress !== null ? (
        <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
          className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div style={{ width: `${progress}%` }} className={`h-full rounded-full ${reached ? 'bg-red-500' : progress >= 80 ? 'bg-amber-500' : 'bg-primary'}`} />
        </div>
      ) : <p className="text-xs text-slate-500">Pas de jauge : aucun plafond défini.</p>}
      {warning && <p role="status" className={`mt-1 text-xs font-medium ${warning.level === 'warning' ? 'text-amber-700' : 'text-red-700'}`}>{warning.text}</p>}
    </div>
  );
}

export default function AiQuotaBar() {
  const [quota, setQuota] = useState(null);
  const [error, setError] = useState('');
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  useEffect(() => {
    let active = true;
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const { data } = await api.get('/ai-quota');
        if (active) { setQuota(data); setError(''); }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Impossible de charger le quota IA.');
      } finally {
        loading = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('ai-quota-refresh', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('ai-quota-refresh', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return (
    <>
      {demoMode && (
        <div role="status" className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Mode démonstration — les données affichées peuvent être des exemples.
        </div>
      )}
      <details aria-label="Quota mensuel IA" className="group mb-4 rounded-lg border border-slate-200 bg-white text-slate-700">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-xs marker:hidden">
          <strong>Quota IA mensuel</strong>
          {quota && !error && (
            <span className="text-slate-600">
              Entreprise : {quota.tenant.limit === null
                ? `${quota.tenant.used} action${quota.tenant.used === 1 ? '' : 's'} utilisée${quota.tenant.used === 1 ? '' : 's'} · sans plafond`
                : `${quota.tenant.used} / ${quota.tenant.limit} actions`}
              {' · '}
              Compte : {quota.user.limit === null
                ? `${quota.user.used} action${quota.user.used === 1 ? '' : 's'} utilisée${quota.user.used === 1 ? '' : 's'} · sans plafond`
                : `${quota.user.used} / ${quota.user.limit} actions`}
            </span>
          )}
          {!quota && !error && <span className="text-slate-500">Chargement…</span>}
          {error && <span className="text-red-700">Quota indisponible</span>}
          <ChevronDown aria-hidden="true" size={14} className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-slate-100 px-3 py-3">
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            <strong>Consommation des actions IA</strong>
            {quota && <span>Renouvellement : {new Date(quota.reset_at).toLocaleDateString('fr-FR', { timeZone: 'UTC' })} (UTC)</span>}
          </div>
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
          {quota && !error && <div className="flex flex-col gap-3 sm:flex-row">
            <QuotaMeter label="Entreprise" quota={quota.tenant} />
            <QuotaMeter label="Votre compte" quota={quota.user} />
          </div>}
          <p className="text-xs text-slate-500">Une action réussie compte pour une unité, même avec plusieurs appels IA. Les échecs sont remboursés. Sans plafond configuré, les actions ne sont pas bloquées par ce quota. Ces quotas sont distincts des limites techniques Groq.</p>
        </div>
      </details>
    </>
  );
}
