import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { AiModuleFields } from '../lib/aiModules.jsx';

export default function AiModuleSettings({ tenantId }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setSettings(null); setError(''); setMessage('');
    api.get(`/ai-quota/tenants/${tenantId}/modules`).then(({ data }) => {
      if (active) setSettings(data);
    }).catch((err) => {
      if (active) setError(err.response?.data?.error || 'Impossible de charger les modules IA.');
    });
    return () => { active = false; };
  }, [tenantId]);
  async function save(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const { data } = await api.patch(`/ai-quota/tenants/${tenantId}/modules`, settings);
      setSettings(data);
      window.dispatchEvent(new Event('tenant-refresh'));
      window.dispatchEvent(new CustomEvent('ai-settings-updated', { detail: { tenantId } }));
      setMessage('Accès IA enregistrés.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier les modules IA.');
    } finally {
      setSaving(false);
    }
  }
  return <section className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assistance IA par module</h3>
    <p className="text-xs text-slate-500">Réglages indépendants du forfait. Les fonctions métier et les résultats déjà enregistrés restent accessibles. Les boutons IA disparaissent et les nouveaux appels sont bloqués côté serveur.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {!settings && !error && <p className="text-sm text-slate-500">Chargement…</p>}
    {settings && <form onSubmit={save} className="space-y-3 rounded-md border border-slate-200 p-3">
      <AiModuleFields settings={settings} onChange={setSettings} disabled={saving} />
      <button disabled={saving} className="rounded-md bg-primary px-3 py-2 text-xs text-white disabled:opacity-50">
        {saving ? 'Enregistrement…' : 'Enregistrer les accès IA'}
      </button>
    </form>}
  </section>;
}
