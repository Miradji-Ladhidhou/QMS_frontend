import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import AutoTextarea from './AutoTextarea.jsx';

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

const FIELD_LABELS = {
  external_issues: 'Enjeux externes (marché, réglementation, concurrence...)',
  internal_issues: 'Enjeux internes (ressources, culture, organisation...)',
  products_services: 'Produits et services couverts par le SMQ',
  scope_description: 'Périmètre du SMQ (limites, sites, activités)',
  excluded_requirements: "Exigences de la norme non applicables, et leur justification",
};

function emptyForm() {
  return { external_issues: '', internal_issues: '', products_services: '', scope_description: '', excluded_requirements: '', interested_parties: [] };
}

function formFromVersion(version) {
  return {
    external_issues: version?.external_issues || '',
    internal_issues: version?.internal_issues || '',
    products_services: version?.products_services || '',
    scope_description: version?.scope_description || '',
    excluded_requirements: version?.excluded_requirements || '',
    interested_parties: version?.interested_parties?.length ? version.interested_parties.map((p) => ({ ...p })) : [],
  };
}

// ISO 9001 §4.1-4.3 : le contexte de l'organisme (enjeux externes/internes, §4.1) doit être
// surveillé et revu dans le temps — d'où le même principe de versions que la politique
// qualité (routes/qmsContext.js), mais sans accusé de lecture : c'est un exercice de
// direction, pas une communication descendante à tout le tenant.
export default function QmsContextSettings({ isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // silent: true pour un rechargement après une publication déjà en cours — sans ça, le
  // skeleton de chargement remplaçait tout le panneau, y compris le message de succès qu'on
  // venait juste d'afficher (même bug déjà corrigé sur QualityPolicySettings.jsx).
  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/qms-context');
      setData(data);
    } catch {
      setError('Impossible de charger le contexte du SMQ.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEditing() {
    setForm(formFromVersion(data?.current));
    setError('');
    setSuccess('');
    setIsEditing(true);
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateParty(index, field, value) {
    setForm((prev) => ({
      ...prev,
      interested_parties: prev.interested_parties.map((party, i) => (i === index ? { ...party, [field]: value } : party)),
    }));
  }

  function addParty() {
    setForm((prev) => ({ ...prev, interested_parties: [...prev.interested_parties, { name: '', requirements: '' }] }));
  }

  function removeParty(index) {
    setForm((prev) => ({ ...prev, interested_parties: prev.interested_parties.filter((_, i) => i !== index) }));
  }

  async function handlePublish(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.post('/qms-context', {
        ...form,
        // Une partie intéressée ajoutée puis jamais nommée (ligne laissée vide, "Ajouter" puis
        // rien saisi) ne doit pas être publiée telle quelle : le backend la rejetterait de
        // toute façon (nom requis), autant la filtrer ici pour un message d'erreur plus utile.
        interested_parties: form.interested_parties.filter((party) => party.name.trim() !== ''),
      });
      setIsEditing(false);
      setSuccess('Contexte du SMQ publié.');
      await load({ silent: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de publier le contexte du SMQ.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  const current = data?.current || null;
  const history = (data?.versions || []).filter((version) => version.id !== current?.id);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Contexte du SMQ</h2>
        {isAdmin && !isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={16} />
            {current ? 'Réviser' : 'Publier'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      {isEditing ? (
        <form onSubmit={handlePublish} className="mt-4 space-y-4">
          {Object.entries(FIELD_LABELS).map(([field, label]) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
              <AutoTextarea
                rows={2}
                value={form[field]}
                onChange={(e) => updateField(field, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          ))}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Parties intéressées et leurs exigences</label>
              <button type="button" onClick={addParty} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <Plus size={14} />
                Ajouter
              </button>
            </div>
            {form.interested_parties.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune partie intéressée ajoutée.</p>
            ) : (
              <div className="space-y-2">
                {form.interested_parties.map((party, index) => (
                  <div key={index} className="flex gap-2 rounded-md border border-slate-200 p-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Nom (ex : Clients, Organisme certificateur...)"
                        value={party.name}
                        onChange={(e) => updateParty(index, 'name', e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder="Exigences"
                        value={party.requirements || ''}
                        onChange={(e) => updateParty(index, 'requirements', e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParty(index)}
                      aria-label="Retirer cette partie intéressée"
                      className="shrink-0 self-start rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? 'Publication...' : 'Publier cette version'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : current ? (
        <>
          <div className="mt-4 space-y-3">
            {Object.entries(FIELD_LABELS).map(([field, label]) => (
              <div key={field}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm text-slate-700">{current[field] || '—'}</p>
              </div>
            ))}
            <div>
              <p className="text-xs text-slate-500">Parties intéressées et leurs exigences</p>
              {current.interested_parties?.length ? (
                <ul className="mt-1 space-y-1">
                  {current.interested_parties.map((party, index) => (
                    <li key={index} className="text-sm text-slate-700">
                      <span className="font-medium">{party.name}</span>
                      {party.requirements ? ` — ${party.requirements}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-700">—</p>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Dernière révision : {formatDateTime(current.created_at)}
            {current.author?.full_name ? ` par ${current.author.full_name}` : ''}
          </p>

          {history.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {showHistory ? 'Masquer' : 'Voir'} l'historique ({history.length})
              </button>
              {showHistory && (
                <ul className="mt-3 space-y-2">
                  {history.map((version) => (
                    <li key={version.id} className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">
                        {formatDateTime(version.created_at)}
                        {version.author?.full_name ? ` — ${version.author.full_name}` : ''}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {version.scope_description || version.external_issues || 'Aucune description résumée.'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          {isAdmin ? "Aucun contexte du SMQ publié pour l'instant." : "Le contexte du SMQ n'a pas encore été publié."}
        </p>
      )}
    </div>
  );
}
