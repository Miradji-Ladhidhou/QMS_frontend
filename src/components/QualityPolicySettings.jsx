import { useEffect, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import AutoTextarea from './AutoTextarea.jsx';

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// ISO 9001 §5.2 : la politique qualité doit être documentée, communiquée, comprise et
// disponible pour les parties intéressées, et revue pour rester adéquate dans le temps.
// Contrairement à une procédure (rédigée par quelqu'un, validée par quelqu'un d'autre), c'est
// un engagement porté directement par la direction : publier une nouvelle version (admin) la
// rend immédiatement "en vigueur", pas de workflow de validation séparé — voir
// routes/qualityPolicy.js. L'accusé de lecture et l'agrégat "X/Y ont pris connaissance"
// donnent la preuve concrète de la diffusion et de la compréhension exigées par la norme.
export default function QualityPolicySettings({ isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/quality-policy');
      setData(data);
    } catch {
      setError('Impossible de charger la politique qualité.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEditing() {
    setDraft(data?.current?.content || '');
    setError('');
    setSuccess('');
    setIsEditing(true);
  }

  async function handlePublish(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.post('/quality-policy', { content: draft });
      setIsEditing(false);
      setSuccess('Politique qualité publiée.');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de publier la politique qualité.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAcknowledge() {
    setError('');
    setAcknowledging(true);
    try {
      await api.post('/quality-policy/acknowledge');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer votre lecture.");
    } finally {
      setAcknowledging(false);
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
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Politique qualité</h2>
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
        <form onSubmit={handlePublish} className="mt-4 space-y-3">
          <AutoTextarea
            required
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Notre engagement en matière de qualité..."
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
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
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{current.content}</p>
          <p className="mt-3 text-xs text-slate-500">
            Dernière révision : {formatDateTime(current.created_at)}
            {current.author?.full_name ? ` par ${current.author.full_name}` : ''}
          </p>

          {data.acknowledgment_summary && (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {data.acknowledgment_summary.acknowledged_count}/{data.acknowledgment_summary.total_users} personnes ont pris
              connaissance de cette version.
            </p>
          )}

          <div className="mt-4">
            {data.my_acknowledgment ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                <Check size={16} />
                Pris connaissance le {formatDateTime(data.my_acknowledgment.acknowledged_at)}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={acknowledging}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <Check size={16} />
                {acknowledging ? 'Enregistrement...' : 'J’ai pris connaissance'}
              </button>
            )}
          </div>

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
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{version.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          {isAdmin ? "Aucune politique qualité publiée pour l'instant." : "La politique qualité n'a pas encore été publiée."}
        </p>
      )}
    </div>
  );
}
