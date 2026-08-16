import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import CapaStatusBadge from '../components/CapaStatusBadge.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

export default function CapaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [capa, setCapa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  async function loadCapa() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/capas/${id}`);
      setCapa(data);
    } catch {
      setError('Impossible de charger cette CAPA.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCapa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddComment(event) {
    event.preventDefault();
    if (!commentText.trim()) return;

    setCommentError('');
    setSubmittingComment(true);

    try {
      const { data } = await api.post(`/capas/${id}/comments`, { comment: commentText.trim() });
      setCapa((prev) => ({ ...prev, comments: [...prev.comments, data] }));
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.error || "Impossible d'ajouter le commentaire.");
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error || !capa) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {error || 'CAPA introuvable.'}
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/capas')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-primary"
      >
        <ArrowLeft size={16} />
        Retour aux CAPA
      </button>

      <div className={`rounded-xl border bg-white p-5 sm:p-6 ${capa.status === 'overdue' ? 'border-red-300' : 'border-slate-200'}`}>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{capa.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{capa.number}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CapaPriorityBadge priority={capa.priority} />
            <CapaStatusBadge status={capa.status} />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Origine</dt>
            <dd className="mt-1 text-sm text-slate-800">{capa.origin || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Responsable assigné</dt>
            <dd className="mt-1 text-sm text-slate-800">{capa.assigned?.full_name || 'Non assigné'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Échéance</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(capa.due_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Clôturée le</dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDate(capa.closed_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 sm:text-base">Commentaires de suivi</h2>

        {capa.comments.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun commentaire pour l'instant.</p>
        ) : (
          <ul className="space-y-4">
            {capa.comments.map((comment) => (
              <li key={comment.id} className="rounded-md bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{comment.author?.full_name || 'Utilisateur'}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(comment.created_at)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-700">{comment.comment}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddComment} className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          {commentError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{commentError}</p>
          )}
          <textarea
            rows={3}
            placeholder="Ajouter un commentaire de suivi..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            disabled={submittingComment || !commentText.trim()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            <Send size={16} />
            {submittingComment ? 'Envoi...' : 'Ajouter le commentaire'}
          </button>
        </form>
      </div>
    </div>
  );
}
