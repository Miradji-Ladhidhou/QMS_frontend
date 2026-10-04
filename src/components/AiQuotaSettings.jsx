import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { QuotaMeter } from './AiQuotaBar.jsx';

function LimitForm({ label, quota, userId, onSave }) {
  const [limit, setLimit] = useState(quota.limit === null ? '' : String(quota.limit));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setLimit(quota.limit === null ? '' : String(quota.limit)); }, [quota.limit]);
  async function submit(event) {
    event.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try {
      await onSave(limit === '' ? null : Number(limit), userId);
      setMessage('Quota enregistré.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier le quota.');
    } finally {
      setSaving(false);
    }
  }
  return <form onSubmit={submit} className="space-y-2 rounded-md border border-slate-200 p-3">
    <QuotaMeter label={label} quota={quota} />
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex-1 text-xs">
        Limite mensuelle (vide = illimité, 0 = bloqué)
        <input aria-label={`Limite IA : ${label}`} type="number" min="0" max="1000000" step="1" value={limit}
          onChange={(event) => setLimit(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5" />
      </label>
      <button disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-xs text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
  </form>;
}

export default function AiQuotaSettings({ tenantId }) {
  const [quota, setQuota] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setQuota(null);
    setError('');
    api.get(`/ai-quota/tenants/${tenantId}`).then(({ data }) => {
      if (active) { setQuota(data); setError(''); }
    }).catch((err) => { if (active) setError(err.response?.data?.error || 'Impossible de charger les quotas IA.'); });
    return () => { active = false; };
  }, [tenantId]);
  async function save(limit, userId) {
    const { data } = await api.patch(`/ai-quota/tenants/${tenantId}`, { limit, ...(userId ? { user_id: userId } : {}) });
    setQuota(data);
  }
  return <section className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quotas IA mensuels</h3>
    <p className="text-xs text-slate-500">Une action doit respecter les deux limites : entreprise et utilisateur. Modifier une limite ne remet pas la consommation à zéro. Mois calendaire UTC.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!quota && !error && <p className="text-sm text-slate-500">Chargement…</p>}
    {quota && <>
      <LimitForm label="Entreprise" quota={quota.tenant} onSave={save} />
      {quota.users.map((user) => <LimitForm key={user.id} label={user.full_name || 'Utilisateur'} quota={user} userId={user.id} onSave={save} />)}
    </>}
  </section>;
}
