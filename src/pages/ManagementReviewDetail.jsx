import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { REVIEW_STATUS_LABELS } from '../lib/managementReviewStatus.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import ReviewStatusBadge from '../components/ReviewStatusBadge.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

const TEXT_SECTIONS = [
  { key: 'previous_actions_status', label: 'Statut des actions de la revue précédente' },
  { key: 'context_changes', label: 'Évolutions du contexte' },
  { key: 'resource_adequacy', label: 'Adéquation des ressources' },
  { key: 'improvement_opportunities', label: "Opportunités d'amélioration" },
  { key: 'conclusions', label: 'Conclusions et décisions' },
];

function SnapshotStat({ value, label }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function SnapshotBlock({ snapshot }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">État du SMQ à la clôture</h2>
      <p className="mt-1 text-xs text-slate-500">Capturé automatiquement le {formatDateTime(snapshot.generated_at)}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SnapshotStat value={snapshot.capas.open + snapshot.capas.in_progress} label="CAPA ouvertes" />
        <SnapshotStat value={snapshot.capas.overdue} label="CAPA en retard" />
        <SnapshotStat value={snapshot.audits.planned + snapshot.audits.in_progress} label="Audits en cours" />
        <SnapshotStat value={snapshot.kpis.off_target} label="KPI hors objectif" />
        <SnapshotStat value={snapshot.documents.to_review} label="Documents à réviser" />
        <SnapshotStat value={snapshot.trainings.to_renew} label="Formations à renouveler" />
      </div>
    </div>
  );
}

function EditReviewModal({ review, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: review.title,
    review_date: review.review_date,
    participants: review.participants || '',
    previous_actions_status: review.previous_actions_status || '',
    context_changes: review.context_changes || '',
    resource_adequacy: review.resource_adequacy || '',
    improvement_opportunities: review.improvement_opportunities || '',
    conclusions: review.conclusions || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.patch(`/management-reviews/${review.id}`, form);
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette revue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier la revue</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date de revue</label>
              <input
                type="date"
                required
                value={form.review_date}
                onChange={(e) => updateField('review_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Participants</label>
              <input
                type="text"
                value={form.participants}
                onChange={(e) => updateField('participants', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {TEXT_SECTIONS.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
              <textarea
                rows={2}
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateCapaFromActionModal({ reviewId, action, users, services, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    service_id: '',
    priority: 'medium',
    severity: 'medium',
    assigned_to: '',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title: form.title,
        service_id: form.service_id || undefined,
        priority: form.priority,
        severity: form.severity,
        assigned_to: form.assigned_to || undefined,
        due_date: form.due_date || undefined,
      };
      const { data } = await api.post(`/management-reviews/${reviewId}/actions/${action.id}/create-capa`, payload);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cette action</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{action.description}</p>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet de la CAPA</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Échéance</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
              <select
                value={form.service_id}
                onChange={(e) => updateField('service_id', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Aucun</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assigné à</label>
              <select
                value={form.assigned_to}
                onChange={(e) => updateField('assigned_to', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Non assigné</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer la CAPA'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ManagementReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [review, setReview] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionDescription, setActionDescription] = useState('');
  const [actionError, setActionError] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [capaModalAction, setCapaModalAction] = useState(null);

  async function loadReview() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/management-reviews/${id}`);
      setReview(data);
    } catch {
      setError('Impossible de charger cette revue de direction.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReview();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/management-reviews/${id}`, { status });
      setReview((prev) => ({ ...prev, ...data }));
    } catch {
      setError('Impossible de mettre à jour le statut.');
    }
  }

  async function handleDeleteReview() {
    if (!window.confirm(`Supprimer définitivement la revue "${review.title}" et ses actions ?`)) return;
    try {
      await api.delete(`/management-reviews/${id}`);
      navigate('/management-reviews');
    } catch {
      setError('Impossible de supprimer cette revue.');
    }
  }

  async function handleAddAction(event) {
    event.preventDefault();
    setActionError('');
    setSubmittingAction(true);
    try {
      const { data } = await api.post(`/management-reviews/${id}/actions`, { description: actionDescription });
      setReview((prev) => ({ ...prev, actions: [...prev.actions, data] }));
      setIsActionModalOpen(false);
      setActionDescription('');
    } catch (err) {
      setActionError(err.response?.data?.error || "Impossible d'ajouter cette action.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleDeleteAction(action) {
    if (!window.confirm('Supprimer cette action ?')) return;
    try {
      await api.delete(`/management-reviews/${id}/actions/${action.id}`);
      setReview((prev) => ({ ...prev, actions: prev.actions.filter((a) => a.id !== action.id) }));
    } catch {
      setError('Impossible de supprimer cette action.');
    }
  }

  function handleCapaCreated(action, capa) {
    setReview((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === action.id ? { ...a, linked_capa: capa } : a)),
    }));
    setCapaModalAction(null);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !review) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!review) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/management-reviews')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{review.title}</h1>
        <div className="flex items-center gap-2">
          {canManage ? (
            <select
              value={review.status}
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <ReviewStatusBadge status={review.status} />
          )}
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                aria-label="Modifier"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={handleDeleteReview}
                aria-label="Supprimer"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Date de revue</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(review.review_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Participants</p>
          <p className="text-sm font-medium text-slate-800">{review.participants || '—'}</p>
        </div>
      </div>

      {review.snapshot && (
        <div className="mt-4">
          <SnapshotBlock snapshot={review.snapshot} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {TEXT_SECTIONS.map(({ key, label }) =>
          review[key] ? (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-sm text-slate-700">{review[key]}</p>
            </div>
          ) : null
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Actions décidées ({review.actions.length})</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setIsActionModalOpen(true)}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Ajouter une action
          </button>
        )}
      </div>

      {review.actions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aucune action pour l'instant.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {review.actions.map((action) => (
            <div key={action.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700">{action.description}</p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAction(action)}
                    aria-label="Supprimer l'action"
                    className="shrink-0 p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {action.linked_capa ? (
                <Link
                  to={`/capas/${action.linked_capa.id}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <ClipboardCheck size={14} />
                  Voir la CAPA liée — {action.linked_capa.number}
                </Link>
              ) : (
                canManage && (
                  <button
                    type="button"
                    onClick={() => setCapaModalAction(action)}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                  >
                    <ClipboardCheck size={14} />
                    Créer une CAPA
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {isEditModalOpen && (
        <EditReviewModal
          review={review}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setReview((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nouvelle action</h2>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                aria-label="Fermer"
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
            )}

            <form onSubmit={handleAddAction} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  rows={3}
                  required
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={submittingAction}
                className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {submittingAction ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {capaModalAction && (
        <CreateCapaFromActionModal
          reviewId={id}
          action={capaModalAction}
          users={users}
          services={services}
          onClose={() => setCapaModalAction(null)}
          onCreated={(capa) => handleCapaCreated(capaModalAction, capa)}
        />
      )}
    </div>
  );
}
