import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { QMS_CHANGE_STATUS_LABELS, QMS_CHANGE_VALID_TRANSITIONS } from '../lib/qmsChangeStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import QmsChangeStatusBadge from '../components/QmsChangeStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function EditChangeModal({ change, services, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: change.title,
    description: change.description,
    purpose: change.purpose || '',
    potential_consequences: change.potential_consequences || '',
    integrity_impact: change.integrity_impact || '',
    resources_needed: change.resources_needed || '',
    responsibilities_reallocation: change.responsibilities_reallocation || '',
    planned_date: change.planned_date || '',
    service_id: change.service_id || '',
    category_id: change.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(change.is_private_to_me));
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
        categoryId = await resolvePersonalCategoryId('qms_change');
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
      ({ data } = await api.patch(`/qms-changes/${change.id}`, {
        title: form.title,
        description: form.description,
        purpose: form.purpose || null,
        potential_consequences: form.potential_consequences || null,
        integrity_impact: form.integrity_impact || null,
        resources_needed: form.resources_needed || null,
        responsibilities_reallocation: form.responsibilities_reallocation || null,
        planned_date: form.planned_date || null,
        service_id: form.service_id || null,
        category_id: categoryId,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette modification.');
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
          <h2 className="text-lg font-semibold text-slate-900">Modifier la fiche</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <AutoTextarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Finalité <span className="font-normal text-slate-400">(requis pour approuver — §6.3 a)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.purpose}
              onChange={(e) => updateField('purpose', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Conséquences potentielles <span className="font-normal text-slate-400">(requis pour approuver — §6.3 a)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.potential_consequences}
              onChange={(e) => updateField('potential_consequences', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Impact sur l'intégrité du SMQ <span className="font-normal text-slate-400">(requis pour approuver — §6.3 b)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.integrity_impact}
              onChange={(e) => updateField('integrity_impact', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ressources nécessaires <span className="font-normal text-slate-400">(requis pour approuver — §6.3 c)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.resources_needed}
              onChange={(e) => updateField('resources_needed', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Responsabilités et autorités <span className="font-normal text-slate-400">(requis pour approuver — §6.3 d)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.responsibilities_reallocation}
              onChange={(e) => updateField('responsibilities_reallocation', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date prévue</label>
              <input
                type="date"
                value={form.planned_date}
                onChange={(e) => updateField('planned_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service concerné</label>
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

// Motif obligatoire pour annuler — même idiome "commentaire sur verdict négatif" que les
// autres modules, présenté en modale dédiée plutôt que dans le formulaire d'édition général :
// annuler est une action ponctuelle déclenchée depuis le sélecteur de statut, pas un champ
// qu'on pré-remplit à l'avance comme purpose/resources_needed.
function CancelChangeModal({ change, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let data;
    try {
      ({ data } = await api.patch(`/qms-changes/${change.id}`, { status: 'cancelled', cancellation_reason: reason }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'annuler cette modification.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCancelled(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Annuler cette modification</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motif de l'annulation</label>
            <AutoTextarea
              rows={3}
              required
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Annulation...' : 'Confirmer l’annulation'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function QmsChangeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [change, setChange] = useState(null);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  async function loadChange() {
    setLoading(true);
    try {
      const { data } = await api.get(`/qms-changes/${id}`);
      setChange(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger cette modification.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChange();
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    api
      .get('/module-categories', { params: { resource_type: 'qms_change' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Ne propose que les transitions que le backend acceptera (voir
  // lib/qmsChangeStatus.js#QMS_CHANGE_VALID_TRANSITIONS) — 'cancelled' est traité à part via
  // CancelChangeModal (motif obligatoire), jamais directement par ce sélecteur.
  async function handleStatusChange(event) {
    const status = event.target.value;
    if (status === 'cancelled') {
      setIsCancelModalOpen(true);
      return;
    }
    try {
      const { data } = await api.patch(`/qms-changes/${id}`, { status });
      setChange((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le statut.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement "${change.title}" ?`)) return;
    try {
      await api.delete(`/qms-changes/${id}`);
      navigate('/qms-changes');
    } catch {
      setError('Impossible de supprimer cette modification.');
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !change) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!change) return null;

  const nextStatuses = QMS_CHANGE_VALID_TRANSITIONS[change.status] || [];

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/qms-changes')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{change.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && nextStatuses.length > 0 ? (
            <select
              value=""
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="" disabled>
                {QMS_CHANGE_STATUS_LABELS[change.status]}
              </option>
              {nextStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'cancelled' ? 'Annuler' : `Passer à : ${QMS_CHANGE_STATUS_LABELS[status]}`}
                </option>
              ))}
            </select>
          ) : (
            <QmsChangeStatusBadge status={change.status} />
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
          <p className="text-xs text-slate-500">Date prévue</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(change.planned_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{change.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Approuvée par / le</p>
          <p className="text-sm font-medium text-slate-800">
            {change.approver?.full_name ? `${change.approver.full_name} — ${formatDate(change.approved_at)}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Mise en œuvre par / le</p>
          <p className="text-sm font-medium text-slate-800">
            {change.implementer?.full_name ? `${change.implementer.full_name} — ${formatDate(change.implemented_at)}` : '—'}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <p className="text-xs text-slate-500">Description</p>
          <p className="text-sm text-slate-700">{change.description}</p>
        </div>
        {change.purpose && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Finalité (§6.3 a)</p>
            <p className="text-sm text-slate-700">{change.purpose}</p>
          </div>
        )}
        {change.potential_consequences && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Conséquences potentielles (§6.3 a)</p>
            <p className="text-sm text-slate-700">{change.potential_consequences}</p>
          </div>
        )}
        {change.integrity_impact && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Impact sur l'intégrité du SMQ (§6.3 b)</p>
            <p className="text-sm text-slate-700">{change.integrity_impact}</p>
          </div>
        )}
        {change.resources_needed && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Ressources nécessaires (§6.3 c)</p>
            <p className="text-sm text-slate-700">{change.resources_needed}</p>
          </div>
        )}
        {change.responsibilities_reallocation && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Responsabilités et autorités (§6.3 d)</p>
            <p className="text-sm text-slate-700">{change.responsibilities_reallocation}</p>
          </div>
        )}
        {change.status === 'cancelled' && change.cancellation_reason && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Motif de l'annulation</p>
            <p className="text-sm text-slate-700">{change.cancellation_reason}</p>
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <EditChangeModal
          change={change}
          services={services}
          categories={categories}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setChange((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isCancelModalOpen && (
        <CancelChangeModal
          change={change}
          onClose={() => setIsCancelModalOpen(false)}
          onCancelled={(data) => {
            setChange((prev) => ({ ...prev, ...data }));
            setIsCancelModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
