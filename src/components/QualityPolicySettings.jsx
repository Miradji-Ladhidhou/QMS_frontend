import { useEffect, useState } from 'react';
import { Check, Download, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import { openBlankTab } from '../lib/openInNewTab.js';
import AutoTextarea from './AutoTextarea.jsx';

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// Panneau admin/manager "qui a lu / qui n'a pas encore" — même principe que
// AcknowledgmentPanel dans DocumentDetail.jsx, chargement à part (n'a besoin d'être appelé que
// pour ce rôle, jamais pour un member qui n'y a pas accès, 403 sinon).
function AcknowledgmentPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/quality-policy/acknowledgments')
      .then(({ data: res }) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les accusés de lecture.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Accusés de lecture</p>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !data ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-emerald-700">Ont lu ({data.acknowledged.length})</p>
            {data.acknowledged.length === 0 ? (
              <p className="text-sm text-slate-500">Personne pour l'instant.</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-700">
                {data.acknowledged.map((entry) => (
                  <li key={entry.user_id}>
                    {entry.user?.full_name || 'Utilisateur supprimé'}
                    <span className="text-slate-400"> · {formatDateTime(entry.acknowledged_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-amber-700">En attente ({data.pending.length})</p>
            {data.pending.length === 0 ? (
              <p className="text-sm text-slate-500">Tout le monde a lu.</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-700">
                {data.pending.map((user) => (
                  <li key={user.id}>{user.full_name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ISO 9001 §5.2 : la politique qualité doit être documentée, communiquée, comprise et
// disponible pour les parties intéressées, et revue pour rester adéquate dans le temps.
// Contrairement à une procédure (rédigée par quelqu'un, validée par quelqu'un d'autre), c'est
// un engagement porté directement par la direction : publier une nouvelle version (admin) la
// rend immédiatement "en vigueur", pas de workflow de validation séparé — voir
// routes/qualityPolicy.js. L'accusé de lecture et l'agrégat "X/Y ont pris connaissance"
// donnent la preuve concrète de la diffusion et de la compréhension exigées par la norme.
export default function QualityPolicySettings({ isAdmin, isManager }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // silent: true pour un rechargement après une action déjà en cours (publier/accuser
  // réception) — sans ça, le skeleton de chargement remplaçait tout le panneau, y compris le
  // message de succès qu'on venait juste d'afficher (voir handlePublish/handleAcknowledge).
  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/quality-policy');
      setData(data);
    } catch {
      setError('Impossible de charger la politique qualité.');
    } finally {
      if (!silent) setLoading(false);
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
      await load({ silent: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de publier la politique qualité.');
    } finally {
      setSaving(false);
    }
  }

  // Même schéma que le certificat de signature/les rapports KPI (DocumentDetail.jsx,
  // Kpis.jsx) : ouvre le PDF dans un nouvel onglet plutôt qu'un téléchargement forcé, pour
  // permettre un aperçu avant impression. openBlankTab() doit être appelé de façon SYNCHRONE,
  // avant le premier await, sous peine d'être bloqué par Safari iOS.
  async function handleDownloadPdf() {
    const tab = openBlankTab();
    setError('');
    setDownloadingPdf(true);
    try {
      const response = await api.get('/quality-policy/pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      if (tab) tab.location.href = url;
    } catch {
      tab?.close();
      setError('Impossible de générer le PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleAcknowledge() {
    setError('');
    setAcknowledging(true);
    try {
      await api.post('/quality-policy/acknowledge');
      await load({ silent: true });
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
        <div className="flex shrink-0 items-center gap-2">
          {current && !isEditing && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Download size={16} />
              {downloadingPdf ? 'Génération...' : 'PDF'}
            </button>
          )}
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

          {isManager && <AcknowledgmentPanel />}

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
