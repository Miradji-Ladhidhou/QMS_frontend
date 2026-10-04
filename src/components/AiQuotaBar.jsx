import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { quotaProgress, quotaWarning } from '../lib/aiQuota.js';

export function QuotaMeter({ label, quota }) {
  const progress = quotaProgress(quota);
  const reached = quota.remaining === 0;
  const warning = quotaWarning(quota);
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs">
        <span className="font-medium">{label}</span>
        <span>{quota.used} / {quota.limit === null ? 'Illimité' : quota.limit}{quota.pending > 0 ? ` (+${quota.pending} en cours)` : ''}</span>
      </div>
      {progress !== null ? (
        <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
          className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div style={{ width: `${progress}%` }} className={`h-full rounded-full ${reached ? 'bg-red-500' : progress >= 80 ? 'bg-amber-500' : 'bg-primary'}`} />
        </div>
      ) : <p className="text-xs text-slate-500">Aucune limite configurée</p>}
      {warning && <p role="status" className={`mt-1 text-xs font-medium ${warning.level === 'warning' ? 'text-amber-700' : 'text-red-700'}`}>{warning.text}</p>}
    </div>
  );
}

export default function AiQuotaBar() {
  const [quota, setQuota] = useState(null);
  const [error, setError] = useState('');
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
    <section aria-label="Quota mensuel IA" className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-slate-700">
      <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
        <strong>Quota IA mensuel · actions</strong>
        {quota && <span>Renouvellement : {new Date(quota.reset_at).toLocaleDateString('fr-FR', { timeZone: 'UTC' })} (UTC)</span>}
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {!quota && !error && <p className="text-xs text-slate-500">Chargement du quota…</p>}
      {quota && !error && <div className="flex flex-col gap-3 sm:flex-row">
        <QuotaMeter label="Entreprise" quota={quota.tenant} />
        <QuotaMeter label="Votre compte" quota={quota.user} />
      </div>}
      <p className="mt-2 text-xs text-slate-500">Une action réussie = une unité, même avec plusieurs appels IA. Les échecs sont remboursés. Ces quotas sont distincts des limites techniques Groq.</p>
    </section>
  );
}
