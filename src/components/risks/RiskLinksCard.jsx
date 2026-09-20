import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Plus, X } from 'lucide-react';
import { api } from '../../lib/api.js';

const KIND_LABELS = { audit: 'Audit', supplier: 'Fournisseur', kpi: 'KPI', procedure: 'Procédure' };
const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:py-2 sm:text-sm';

// Éléments du système qualité rattachés à ce risque : audit qui l'a révélé, fournisseur concerné, KPI qui
// le mesure, procédure qui le maîtrise. Lecture pour tous, rattachement/détachement pour admin/manager.
export default function RiskLinksCard({ riskId, canManage, refreshKey, onChanged }) {
  const [links, setLinks] = useState(null);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState('audit');
  const [candidates, setCandidates] = useState([]);
  const [refId, setRefId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/risks/${riskId}/links`)
      .then(({ data }) => setLinks(data))
      .catch(() => setLinks([]));
  }, [riskId, refreshKey]);

  // Liste de choix du type sélectionné : chargée seulement quand le formulaire est ouvert.
  useEffect(() => {
    if (!adding) return;
    setRefId('');
    api
      .get('/risks/link-candidates', { params: { kind } })
      .then(({ data }) => setCandidates(data))
      .catch(() => setCandidates([]));
  }, [adding, kind]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!refId) {
      setError('Choisissez un élément.');
      return;
    }
    setError('');
    try {
      const { data } = await api.post(`/risks/${riskId}/links`, { kind, ref_id: refId });
      setLinks(data);
      setAdding(false);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le lien.');
    }
  }

  async function handleRemove(link) {
    try {
      await api.delete(`/risks/${riskId}/links/${link.id}`);
      setLinks((prev) => prev.filter((item) => item.id !== link.id));
      onChanged?.();
    } catch {
      setError('Impossible de retirer ce lien.');
    }
  }

  if (links === null) return null;
  if (links.length === 0 && !canManage) return null;

  const linkedIds = new Set(links.filter((link) => link.kind === kind).map((link) => link.ref_id));
  const available = candidates.filter((candidate) => !linkedIds.has(candidate.id));

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Link2 size={15} className="text-slate-400" />
          Éléments liés
        </h2>
        {canManage && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[40px] items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0"
          >
            <Plus size={14} />
            Lier
          </button>
        )}
      </div>

      {links.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Aucun audit, fournisseur, KPI ou procédure lié à ce risque.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{link.kind_label}</span>
              <Link to={link.href} className="min-w-0 flex-1 break-words py-1.5 text-primary hover:underline">
                {link.title}
              </Link>
              {canManage && (
                <button type="button" onClick={() => handleRemove(link)} aria-label={`Retirer le lien ${link.title}`} className="-m-2 shrink-0 p-3 text-slate-400 hover:text-red-600">
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type d'élément" className={`${FIELD_CLASS} sm:w-40`}>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select value={refId} onChange={(e) => setRefId(e.target.value)} aria-label="Élément à lier" className={`${FIELD_CLASS} min-w-0 sm:flex-1`}>
              <option value="">{available.length === 0 ? 'Aucun élément disponible' : 'Choisir…'}</option>
              {available.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="min-h-[40px] rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
              Lier
            </button>
            <button type="button" onClick={() => { setAdding(false); setError(''); }} className="min-h-[40px] px-3 text-sm text-slate-600 underline">
              Annuler
            </button>
          </div>
        </form>
      )}
      {!adding && error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
