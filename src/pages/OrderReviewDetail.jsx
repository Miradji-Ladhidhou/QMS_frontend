import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { ORDER_REVIEW_STATUS_LABELS } from '../lib/orderReviewStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import OrderReviewStatusBadge from '../components/OrderReviewStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import PageGuide from '../components/PageGuide.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function EditReviewModal({ review, users, services, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: review.title,
    customer_name: review.customer_name,
    customer_contact: review.customer_contact || '',
    reference: review.reference || '',
    received_at: review.received_at,
    specified_requirements: review.specified_requirements,
    implicit_requirements: review.implicit_requirements || '',
    regulatory_requirements: review.regulatory_requirements || '',
    discrepancies: review.discrepancies || '',
    discrepancies_resolved: review.discrepancies_resolved,
    capability_confirmed: review.capability_confirmed,
    decision_comment: review.decision_comment || '',
    reviewed_by: review.reviewed_by || '',
    service_id: review.service_id || '',
    category_id: review.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(review.is_private_to_me));
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
        categoryId = await resolvePersonalCategoryId('order_review');
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
      ({ data } = await api.patch(`/order-reviews/${review.id}`, {
        title: form.title,
        customer_name: form.customer_name,
        customer_contact: form.customer_contact || null,
        reference: form.reference || null,
        received_at: form.received_at,
        specified_requirements: form.specified_requirements,
        implicit_requirements: form.implicit_requirements || null,
        regulatory_requirements: form.regulatory_requirements || null,
        discrepancies: form.discrepancies || null,
        discrepancies_resolved: form.discrepancies_resolved,
        capability_confirmed: form.capability_confirmed,
        decision_comment: form.decision_comment || null,
        reviewed_by: form.reviewed_by || null,
        service_id: form.service_id || null,
        category_id: categoryId,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette revue.');
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
          <h2 className="text-lg font-semibold text-slate-900">Modifier la revue</h2>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client</label>
              <input
                type="text"
                required
                value={form.customer_name}
                onChange={(e) => updateField('customer_name', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact</label>
              <input
                type="text"
                value={form.customer_contact}
                onChange={(e) => updateField('customer_contact', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Référence commande/devis</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => updateField('reference', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date de réception</label>
              <input
                type="date"
                required
                value={form.received_at}
                onChange={(e) => updateField('received_at', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Exigences spécifiées <span className="font-normal text-slate-400">(y compris livraison/après-livraison)</span>
            </label>
            <AutoTextarea
              rows={3}
              required
              value={form.specified_requirements}
              onChange={(e) => updateField('specified_requirements', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Exigences non énoncées mais nécessaires <span className="font-normal text-slate-400">(si connues)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.implicit_requirements}
              onChange={(e) => updateField('implicit_requirements', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Exigences légales et réglementaires applicables</label>
            <AutoTextarea
              rows={2}
              value={form.regulatory_requirements}
              onChange={(e) => updateField('regulatory_requirements', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Écart avec ce qui avait été précédemment exprimé <span className="font-normal text-slate-400">(ex. un devis)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.discrepancies}
              onChange={(e) => updateField('discrepancies', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {form.discrepancies && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.discrepancies_resolved}
                onChange={(e) => updateField('discrepancies_resolved', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Écart résolu <span className="font-normal text-slate-400">(requis pour accepter)</span>
            </label>
          )}

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.capability_confirmed}
              onChange={(e) => updateField('capability_confirmed', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Capacité à répondre aux exigences confirmée <span className="font-normal text-slate-400">(requis pour accepter)</span>
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Commentaire de décision <span className="font-normal text-slate-400">(requis pour refuser)</span>
            </label>
            <AutoTextarea
              rows={2}
              value={form.decision_comment}
              onChange={(e) => updateField('decision_comment', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Décidé par</label>
            <select
              value={form.reviewed_by}
              onChange={(e) => updateField('reviewed_by', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Non renseigné (par défaut, le décideur)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
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

export default function OrderReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [review, setReview] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  async function loadReview() {
    setLoading(true);
    try {
      const { data } = await api.get(`/order-reviews/${id}`);
      setReview(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger cette revue.');
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
    api
      .get('/module-categories', { params: { resource_type: 'order_review' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/order-reviews/${id}`, { status });
      setReview((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le statut.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement "${review.title}" ?`)) return;
    try {
      await api.delete(`/order-reviews/${id}`);
      navigate('/order-reviews');
    } catch {
      setError('Impossible de supprimer cette revue.');
    }
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
        onClick={() => navigate('/order-reviews')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{review.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <select
              value={review.status}
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(ORDER_REVIEW_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <OrderReviewStatusBadge status={review.status} />
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
      <PageGuide id="orderReviewDetail" />

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Client</p>
          <p className="text-sm font-medium text-slate-800">{review.customer_name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Contact</p>
          <p className="text-sm font-medium text-slate-800">{review.customer_contact || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Référence</p>
          <p className="text-sm font-medium text-slate-800">{review.reference || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Date de réception</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(review.received_at)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{review.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Capacité confirmée</p>
          <p className="text-sm font-medium text-slate-800">{review.capability_confirmed ? 'Oui' : 'Non'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Décidé par</p>
          <p className="text-sm font-medium text-slate-800">{review.reviewer?.full_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Décidé le</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(review.reviewed_at)}</p>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <p className="text-xs text-slate-500">Exigences spécifiées</p>
          <p className="text-sm text-slate-700">{review.specified_requirements}</p>
        </div>
        {review.implicit_requirements && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Exigences non énoncées mais nécessaires</p>
            <p className="text-sm text-slate-700">{review.implicit_requirements}</p>
          </div>
        )}
        {review.regulatory_requirements && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Exigences légales et réglementaires applicables</p>
            <p className="text-sm text-slate-700">{review.regulatory_requirements}</p>
          </div>
        )}
        {review.discrepancies && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">
              Écart avec ce qui avait été précédemment exprimé — {review.discrepancies_resolved ? 'résolu' : 'non résolu'}
            </p>
            <p className="text-sm text-slate-700">{review.discrepancies}</p>
          </div>
        )}
        {review.decision_comment && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Commentaire de décision</p>
            <p className="text-sm text-slate-700">{review.decision_comment}</p>
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <EditReviewModal
          review={review}
          users={users}
          services={services}
          categories={categories}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setReview((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
