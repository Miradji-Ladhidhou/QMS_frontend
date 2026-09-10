import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Folder, FolderCog, List, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { ORDER_REVIEW_STATUS_LABELS } from '../lib/orderReviewStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import OrderReviewStatusBadge from '../components/OrderReviewStatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import PageGuide from '../components/PageGuide.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const REVIEW_SORT_OPTIONS = [
  { key: 'received_at', label: 'date de réception' },
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
];

function getReviewSortValue(review, key) {
  return review[key];
}

// Modale de création — ouverte à tous les rôles côté backend (POST /order-reviews) : la
// personne qui reçoit une commande n'est pas nécessairement admin/manager, même principe que
// Accidents.jsx/NonconformingOutputs.jsx.
function NewReviewModal({ services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    customer_name: '',
    customer_contact: '',
    reference: '',
    received_at: new Date().toISOString().slice(0, 10),
    specified_requirements: '',
    implicit_requirements: '',
    regulatory_requirements: '',
    service_id: '',
    category_id: '',
  });
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || undefined;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('order_review');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      customer_name: form.customer_name,
      customer_contact: form.customer_contact || undefined,
      reference: form.reference || undefined,
      received_at: form.received_at,
      specified_requirements: form.specified_requirements,
      implicit_requirements: form.implicit_requirements || undefined,
      regulatory_requirements: form.regulatory_requirements || undefined,
      service_id: form.service_id || undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/order-reviews', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer cette revue.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle revue de commande</h2>
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
              placeholder="Ex : Commande #2026-118 — Fourniture de 500 unités X"
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
            {submitting ? 'Création...' : 'Créer la revue'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function OrderReviews() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleFolder(key) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  async function handleCategoryChange(event, review) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(review.id);
    try {
      const { data } = await api.patch(`/order-reviews/${review.id}`, { category_id: categoryId });
      setReviews((prev) => prev.map((item) => (item.id === review.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette revue.');
    } finally {
      setUpdatingCategoryId(null);
    }
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} revue(s) sélectionnée(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/order-reviews/bulk', { data: { ids: selectedIds } });
      setReviews((prev) => prev.filter((review) => !selectedIds.includes(review.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces revues.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [reviewsRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/order-reviews', { params }),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'order_review' } }),
      ]);
      setReviews(reviewsRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger le registre des revues de commande.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const searchedReviews = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return reviews;
    return reviews.filter(
      (review) =>
        review.title.toLowerCase().includes(query) ||
        review.customer_name.toLowerCase().includes(query) ||
        (review.reference || '').toLowerCase().includes(query)
    );
  }, [reviews, searchText]);

  const { sorted: sortedReviews, sortKey, direction, setSortKey, toggleSort } = useSort(
    searchedReviews,
    getReviewSortValue,
    'received_at',
    'desc'
  );

  // Un dossier par catégorie (module_categories, resource_type='order_review'), plus un
  // dossier "Sans dossier" en dernier — même principe que NonconformingOutputs.jsx/Accidents.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const review of sortedReviews) {
      if (review.category_id && byCategory.has(review.category_id)) byCategory.get(review.category_id).push(review);
      else unfiled.push(review);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, reviews: byCategory.get(category.id) || [] }))
      .filter((group) => group.reviews.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, reviews: unfiled });
    return groups;
  }, [sortedReviews, categories]);

  const isFolderView = viewMode === 'folder';
  const reviewGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, reviews: sortedReviews }];
  // Miroir de DELETE /order-reviews/:id côté backend : admin/manager uniquement, sans
  // restriction créateur (même choix que nonconforming_outputs.js).
  const deletableIds = canManage ? sortedReviews.map((review) => review.id) : [];

  function handleCreated(review) {
    setIsModalOpen(false);
    navigate(`/order-reviews/${review.id}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Revue des exigences avant engagement</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouvelle revue
        </button>
      </div>
      <PageGuide id="order-reviews" />

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="relative mt-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par titre, client ou référence..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_REVIEW_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={REVIEW_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('folder')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'folder' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Folder size={16} />
            Par dossier
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={16} />
            Liste
          </button>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setIsManageCategoriesOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderCog size={16} />
            Gérer les dossiers
          </button>
        )}
      </div>

      {deletableIds.length > 0 && <SelectAllToggle ids={deletableIds} selectedIds={selectedIds} onChange={setSelectedIds} />}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucune revue de commande enregistrée pour l'instant</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Créer la première revue
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reviewGroups.map((group) => (
            <div key={group.key}>
              {isFolderView && (
                <button
                  type="button"
                  onClick={() => toggleFolder(group.key)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700"
                >
                  {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                  {group.category ? group.category.name : 'Sans dossier'}
                  <span className="font-normal text-slate-400">({group.reviews.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.reviews.map((review) => (
                    <div
                      key={review.id}
                      onClick={() => navigate(`/order-reviews/${review.id}`)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {canManage && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(review.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelect(review.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{review.title}</p>
                          <p className="truncate text-sm text-slate-500">
                            {review.customer_name} · {formatDate(review.received_at)}
                          </p>
                        </div>
                        <OrderReviewStatusBadge status={review.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={review.category} />
                        {canManage && (
                          <select
                            value={review.category_id || ''}
                            disabled={updatingCategoryId === review.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCategoryChange(e, review)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Sans dossier</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewReviewModal services={services} categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="order_review"
          endpoint="/order-reviews/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && <ManageCategoriesModal
          baseUrl="/module-categories"
          resourceType="order_review"
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={loadData}
        />}
    </div>
  );
}
