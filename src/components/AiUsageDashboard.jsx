import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { AI_MODULE_LABELS } from '../lib/aiModules.jsx';

const number = (value) => value.toLocaleString('fr-FR');
const moduleLabel = (key) => key === 'untracked' ? 'Historique non ventilé' : AI_MODULE_LABELS[key]?.split(' — ')[0] || key;

export default function AiUsageDashboard({ tenantId }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [view, setView] = useState('modules');
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setUsage(null); setError('');
    const path = tenantId ? `/ai-quota/tenants/${tenantId}/usage` : '/ai-quota/usage';
    api.get(path, { params: { month } }).then(({ data }) => { if (active) setUsage(data); })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Impossible de charger la consommation IA.'); });
    return () => { active = false; };
  }, [tenantId, month, refresh]);
  return <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-900">Consommation IA détaillée</h3>
      <button type="button" onClick={() => setRefresh((previous) => previous + 1)} className="text-xs font-medium text-primary">Actualiser</button>
    </div>
    <div className="flex flex-wrap gap-3 text-xs">
      <label>Mois UTC <input aria-label="Mois de consommation IA" type="month" value={month} min="2000-01" max="2099-12"
        onChange={(event) => setMonth(event.target.value)} className="ml-2 rounded-md border border-slate-300 px-2 py-1" /></label>
      <label>Ventilation <select aria-label="Ventilation IA" value={view} onChange={(event) => setView(event.target.value)}
        className="ml-2 rounded-md border border-slate-300 px-2 py-1">
        <option value="modules">Par module</option><option value="users">Par salarié</option><option value="rows">Module et salarié</option>
      </select></label>
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {!usage && !error && <p className="text-xs text-slate-500">Chargement…</p>}
    {usage && <>
      <p className="text-xs text-slate-600">Renouvellement : {new Date(usage.reset_at).toLocaleDateString('fr-FR', { timeZone: 'UTC' })} (UTC).
        {' '}{number(usage.totals.succeeded)} action(s) réussie(s), {number(usage.totals.failed)} échec(s),
        {' '}{number(usage.totals.pending)} en cours et {number(usage.totals.expired)} réservation(s) expirée(s).</p>
      <p className="text-xs text-slate-600">Tokens mesurés : <strong>{number(usage.totals.actual_tokens)}</strong> ·
        {' '}estimés sans usage fournisseur : <strong>{number(usage.totals.estimated_tokens)}</strong> ·
        {' '}budgets en cours : <strong>{number(usage.totals.pending_tokens)}</strong>.</p>
      {usage.rows.length === 0 ? <p className="text-xs text-slate-500">Aucune action enregistrée pour ce mois.</p> :
        <div className="overflow-x-auto"><table className="w-full text-left text-xs">
          <thead className="text-slate-500"><tr>{['Périmètre', 'Réussies', 'Échecs', 'En cours', 'Expirées', 'Appels', 'Tokens mesurés', 'Estimés', 'Budget en cours']
            .map((label) => <th key={label} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>
          <tbody>{usage[view].map((row) => <tr key={`${row.module || ''}:${row.user_id || row.id || ''}`} className="border-t border-slate-100">
            <td className="p-2">{view === 'modules' ? moduleLabel(row.module) : view === 'users' ? row.full_name : `${moduleLabel(row.module)} · ${row.full_name}`}</td>
            {['succeeded', 'failed', 'pending', 'expired', 'calls', 'actual_tokens', 'estimated_tokens', 'pending_tokens']
              .map((key) => <td key={key} className="p-2 tabular-nums">{number(row[key])}</td>)}
          </tr>)}</tbody>
        </table></div>}
    </>}
    <p className="text-xs text-slate-500">Une action peut nécessiter plusieurs appels et coûter plus qu’une autre.
      Les échecs remboursent les actions, pas les tokens éventuellement consommés.
      Les budgets estimés ne sont pas une facture Groq. Les appels sont rattachés au mois de lancement de l’action.
      Le suivi des tokens par entreprise débute avec cette mise à jour : les anciens appels ne sont pas réattribués.</p>
  </section>;
}
