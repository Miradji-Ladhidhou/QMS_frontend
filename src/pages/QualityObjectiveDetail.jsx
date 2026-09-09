import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { QUALITY_OBJECTIVE_STATUS_LABELS } from '../lib/qualityObjectiveStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import QualityObjectiveStatusBadge from '../components/QualityObjectiveStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function EditObjectiveModal({ objective, users, kpis, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: objective.title,
    description: objective.description || '',
    resources_needed: objective.resources_needed || '',
    owner: objective.owner || '',
    target_date: objective.target_date || '',
    evaluation_method: objective.evaluation_method || '',
    status_comment: objective.status_comment || '',
    linked_kpi_id: objective.linked_kpi_id || '',
    category_id: objective.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(objective.is_private_to_me));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || null;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('quality_objective');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le parent ne doit jamais se faire passer pour un échec de la modification.
    let data;
    try {
      ({ data } = await api.patch(`/quality-objectives/${objective.id}`, {
        title: form.title,
        description: form.description || null,
        resources_needed: form.resources_needed || null,
        owner: form.owner || null,
        target_date: form.target_date || null,
        evaluation_method: form.evaluation_method || null,
        status_comment: form.status_comment || null,
        linked_kpi_id: form.linked_kpi_id || null,
        category_id: categoryId,
      }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de modifier l'objectif.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier l'objectif</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objectif (quoi)</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <AutoTextarea
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable (qui)</label>
              <select
                value={form.owner}
                onChange={(e) => updateField('owner', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">À désigner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Échéance (quand)</label>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => updateField('target_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ressources nécessaires</label>
            <AutoTextarea
              rows={2}
              value={form.resources_needed}
              onChange={(e) => updateField('resources_needed', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Comment les résultats seront évalués</label>
            <AutoTextarea
              rows={2}
              value={form.evaluation_method}
              onChange={(e) => updateField('evaluation_method', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">KPI de suivi (optionnel)</label>
            <select
              value={form.linked_kpi_id}
              onChange={(e) => updateField('linked_kpi_id', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Aucun</option>
              {kpis.map((kpi) => (
                <option key={kpi.id} value={kpi.id}>
                  {kpi.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Commentaire de statut{' '}
              <span className="font-normal text-slate-400">(requis si "Non atteint" ou "Abandonné")</span>
            </label>
            <AutoTextarea
              rows={2}
              placeholder="Pourquoi cet objectif n'a pas été atteint / a été abandonné..."
              value={form.status_comment}
              onChange={(e) => updateField('status_comment', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <CategoryVisibilityField
            categories={categories}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

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

function CreateCapaFromObjectiveModal({ objectiveId, objective, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: `Objectif qualité — ${objective.title}`,
    priority: 'medium',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let response;
    try {
      response = await api.post(`/quality-objectives/${objectiveId}/create-capa`, {
        title: form.title,
        priority: form.priority,
        due_date: form.due_date || undefined,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cet objectif</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet de la CAPA</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
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

export default function QualityObjectiveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [objective, setObjective] = useState(null);
  const [users, setUsers] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);

  async function loadObjective() {
    setLoading(true);
    try {
      const { data } = await api.get(`/quality-objectives/${id}`);
      setObjective(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de charger l'objectif qualité.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadObjective();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api.get('/kpis').then(({ data }) => setKpis(data)).catch(() => {});
    api
      .get('/module-categories', { params: { resource_type: 'quality_objective' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/quality-objectives/${id}`, { status });
      setObjective((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le statut.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement l'objectif "${objective.title}" ?`)) return;
    try {
      await api.delete(`/quality-objectives/${id}`);
      navigate('/quality-objectives');
    } catch {
      setError("Impossible de supprimer l'objectif.");
    }
  }

  function handleCapaCreated(capa) {
    setObjective((prev) => ({ ...prev, linked_capa: capa }));
    setIsCapaModalOpen(false);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !objective) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!objective) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/quality-objectives')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{objective.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <select
              value={objective.status}
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(QUALITY_OBJECTIVE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <QualityObjectiveStatusBadge status={objective.status} />
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
                onClick={handleDelete}
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

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Responsable</p>
          <p className="text-sm font-medium text-slate-800">{objective.owner_user?.full_name || 'À désigner'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Échéance</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(objective.target_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Atteint le</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(objective.achieved_at)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">KPI de suivi</p>
          {objective.linked_kpi ? (
            <Link to={`/kpis`} className="text-sm font-medium text-primary hover:underline">
              {objective.linked_kpi.name}
            </Link>
          ) : (
            <p className="text-sm font-medium text-slate-800">—</p>
          )}
        </div>
        {objective.description && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Description</p>
            <p className="text-sm text-slate-700">{objective.description}</p>
          </div>
        )}
        {objective.resources_needed && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Ressources nécessaires</p>
            <p className="text-sm text-slate-700">{objective.resources_needed}</p>
          </div>
        )}
        {objective.evaluation_method && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Comment les résultats sont évalués</p>
            <p className="text-sm text-slate-700">{objective.evaluation_method}</p>
          </div>
        )}
        {objective.status_comment && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Commentaire de statut</p>
            <p className="text-sm text-slate-700">{objective.status_comment}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {objective.linked_capa ? (
          <Link
            to={`/capas/${objective.linked_capa.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <ClipboardCheck size={18} />
            Voir la CAPA liée — {objective.linked_capa.number}
          </Link>
        ) : (
          canManage && (
            <button
              type="button"
              onClick={() => setIsCapaModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <ClipboardCheck size={18} />
              Créer une CAPA
            </button>
          )
        )}
      </div>

      {isEditModalOpen && (
        <EditObjectiveModal
          objective={objective}
          users={users}
          kpis={kpis}
          categories={categories}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setObjective((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isCapaModalOpen && (
        <CreateCapaFromObjectiveModal
          objectiveId={id}
          objective={objective}
          onClose={() => setIsCapaModalOpen(false)}
          onCreated={handleCapaCreated}
        />
      )}
    </div>
  );
}
