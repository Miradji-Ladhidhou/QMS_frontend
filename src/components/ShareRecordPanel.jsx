import { useEffect, useState } from 'react';
import { Share2, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';

const ROLE_LABELS = { manager: 'Managers', member: 'Membres' };

// Un admin voit déjà tout partout — inutile de le proposer comme destinataire d'un partage,
// ce serait un octroi sans aucun effet (voir SHAREABLE_ROLES côté backend, même raison).
function nonAdminUsers(users) {
  return users.filter((user) => user.role !== 'admin');
}

// Bouton + modal réutilisables pour donner l'accès à UN élément précis (document, CAPA,
// réclamation...) à un rôle ou une personne qui n'y aurait normalement pas accès — voir
// record_shares côté backend. Admin/manager uniquement (le backend refuse de toute façon 403 à
// un membre, ce bouton n'est juste pas montré aux autres). compact : icône seule, pour s'aligner
// sur les boutons Modifier/Supprimer déjà en icône seule d'une page (ex. ComplaintDetail.jsx).
export default function ShareRecordPanel({ resourceType, resourceId, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subjectType, setSubjectType] = useState('user');
  const [subjectId, setSubjectId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  function loadShares() {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/shares', { params: { resource_type: resourceType, resource_id: resourceId } }),
      api.get('/users'),
    ])
      .then(([{ data: shareData }, { data: userData }]) => {
        setShares(shareData);
        setUsers(nonAdminUsers(userData));
      })
      .catch(() => setError('Impossible de récupérer les partages.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isOpen) loadShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!subjectId) return;

    setError('');
    setAdding(true);
    try {
      await api.post('/shares', { resource_type: resourceType, resource_id: resourceId, subject_type: subjectType, subject_id: subjectId });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer ce partage.");
      setAdding(false);
      return;
    }
    setAdding(false);
    setSubjectId('');
    loadShares();
  }

  async function handleRemove(shareId) {
    setError('');
    setRemovingId(shareId);
    try {
      await api.delete(`/shares/${shareId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de retirer ce partage.');
      setRemovingId(null);
      return;
    }
    setRemovingId(null);
    loadShares();
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Partager"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
        >
          <Share2 size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Share2 size={16} />
          Partager
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Partager</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Donne accès à cet élément précis, en plus des règles habituelles — jamais une restriction.
            </p>

            {error && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            {loading ? (
              <div className="space-y-2">
                {[0, 1].map((key) => (
                  <div key={key} className="h-10 animate-pulse rounded-md bg-slate-100" />
                ))}
              </div>
            ) : (
              <>
                {shares && shares.length > 0 && (
                  <ul className="mb-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                    {shares.map((share) => (
                      <li key={share.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="text-slate-700">
                          {share.subject_type === 'role' ? ROLE_LABELS[share.subject_id] || share.subject_id : share.subject_label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(share.id)}
                          disabled={removingId === share.id}
                          aria-label="Retirer ce partage"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {shares && shares.length === 0 && (
                  <p className="mb-4 text-sm text-slate-400">Pas encore de partage sur cet élément.</p>
                )}

                <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={subjectType}
                    onChange={(e) => {
                      setSubjectType(e.target.value);
                      setSubjectId('');
                    }}
                    className="rounded-md border border-slate-300 px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="user">Personne</option>
                    <option value="role">Rôle</option>
                  </select>

                  {subjectType === 'role' ? (
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Choisir...</option>
                      <option value="manager">Managers</option>
                      <option value="member">Membres</option>
                    </select>
                  ) : (
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Choisir...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="submit"
                    disabled={!subjectId || adding}
                    className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                  >
                    {adding ? '...' : 'Ajouter'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
