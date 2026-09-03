import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { REVIEW_STATUS_LABELS } from '../lib/managementReviewStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import ReviewStatusBadge from '../components/ReviewStatusBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const REVIEW_SORT_OPTIONS = [
  { key: 'review_date', label: 'date de revue' },
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
];

function NewReviewModal({ categories, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let finalCategoryId = categoryId || undefined;
    if (isPrivate) {
      try {
        finalCategoryId = await resolvePersonalCategoryId('management_review');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/management-reviews', {
        title,
        review_date: reviewDate,
        participants: participants || undefined,
        category_id: finalCategoryId,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la revue de direction.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle revue de direction</h2>
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
              autoFocus
              placeholder="Ex : Revue de direction S1 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de revue</label>
            <input
              type="date"
              required
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Participants</label>
            <input
              type="text"
              placeholder="Ex : Direction, Qualité, Production"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <CategoryVisibilityField
            categories={categories}
            categoryId={categoryId}
            onCategoryIdChange={setCategoryId}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ManagementReviews() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [reviews, setReviews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);

  function loadReviews() {
    setLoading(true);
    api
      .get('/management-reviews')
      .then(({ data }) => setReviews(data))
      .catch(() => setError('Impossible de charger les revues de direction.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReviews();
    api
      .get('/module-categories', { params: { resource_type: 'management_review' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadReviews();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} revue(s) sélectionnée(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/management-reviews/bulk', { data: { ids: selectedIds } });
      setReviews((prev) => prev.filter((review) => !selectedIds.includes(review.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces revues.');
    }
  }

  const { sorted: sortedReviews, sortKey, direction, setSortKey, toggleSort } = useSort(
    reviews,
    (review, key) => review[key],
    'review_date',
    'desc'
  );

  function handleCreated(review) {
    setIsModalOpen(false);
    navigate(`/management-reviews/${review.id}`);
  }

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? reviews.filter((review) => scopeIds.includes(review.id)) : reviews;
    const headers = ['Titre', 'Date de revue', 'Statut', 'Participants'];
    const rows = source.map((review) => [
      review.title,
      formatDate(review.review_date),
      REVIEW_STATUS_LABELS[review.status] || review.status,
      review.participants || '',
    ]);
    exportToCsv(`revues-direction-${new Date().toISOString().slice(0, 10)}.csv`, 'Revues de direction', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: `${source.length} revue${source.length > 1 ? 's' : ''}`,
    });
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? reviews.filter((review) => scopeIds.includes(review.id)) : reviews;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre', width: 0.36 },
        { key: 'review_date', label: 'Date de revue', width: 0.18 },
        { key: 'status', label: 'Statut', width: 0.18 },
        { key: 'participants', label: 'Participants', width: 0.28 },
      ];
      const rows = source.map((review) => ({
        title: review.title,
        review_date: formatDate(review.review_date),
        status: REVIEW_STATUS_LABELS[review.status] || review.status,
        participants: review.participants || '',
      }));
      await exportToPdf(`revues-direction-${new Date().toISOString().slice(0, 10)}.pdf`, 'Revues de direction', columns, rows, {
        subtitle: `${source.length} revue${source.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Revues de direction</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={reviews.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || reviews.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Nouvelle revue
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <SortSelect
          options={REVIEW_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {canManage && (
        <SelectAllToggle ids={sortedReviews.map((review) => review.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedIds)}
          onExportPdf={() => handleExportPdf(selectedIds)}
          exportingPdf={exportingPdf}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucune revue de direction pour l'instant</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Créer la première revue
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedReviews.map((review) => (
            <div
              key={review.id}
              onClick={() => navigate(`/management-reviews/${review.id}`)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
            >
              {canManage && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(review.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(review.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{review.title}</p>
                <p className="text-sm text-slate-500">{formatDate(review.review_date)}</p>
              </div>
              <ReviewStatusBadge status={review.status} />
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewReviewModal categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="management_review"
          endpoint="/management-reviews/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}
    </div>
  );
}
