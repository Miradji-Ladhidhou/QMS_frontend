import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderCog, FolderInput, FolderPlus, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { REVIEW_STATUS_LABELS } from '../lib/managementReviewStatus.js';
import { exportTableCsv, exportToPdf, exportToXlsx, exportToWord, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import ReviewStatusBadge from '../components/ReviewStatusBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import FolderTile from '../components/FolderTile.jsx';
import FolderBreadcrumb from '../components/FolderBreadcrumb.jsx';
import FolderPickerModal from '../components/FolderPickerModal.jsx';
import NewFolderModal from '../components/NewFolderModal.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import PageGuide from '../components/PageGuide.jsx';

const CATEGORIES_BASE_URL = '/module-categories';
const REVIEW_RESOURCE_TYPE = 'management_review';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const REVIEW_SORT_OPTIONS = [
  { key: 'review_date', label: 'date de revue' },
  { key: 'title', label: 'titre' },
  { key: 'category', label: 'dossier' },
  { key: 'status', label: 'statut' },
];

function getReviewSortValue(review, key) {
  if (key === 'category') return review.category?.name || '';
  return review[key];
}

// Défaut "trimestre écoulé" pour la période des données d'entrée — simple point de départ
// suggéré, librement modifiable avant de créer la revue.
function defaultPeriodStart() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().slice(0, 10);
}

function NewReviewModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
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
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Période des données d'entrée
              <span className="ml-1 font-normal text-slate-400">(KPI, audits, réclamations, CAPA, risques)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={REVIEW_RESOURCE_TYPE}
            categoryName={categoryName}
            categoryId={categoryId}
            onCategoryIdChange={setCategoryId}
            onCategoryNameChange={setCategoryName}
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
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingReview, setMovingReview] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: REVIEW_RESOURCE_TYPE });

  async function handleMoveReview(folderId) {
    const review = movingReview;
    setMovingReview(null);
    try {
      const { data } = await api.patch(`/management-reviews/${review.id}`, { category_id: folderId || null });
      setReviews((prev) => prev.map((item) => (item.id === review.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette revue.');
    }
  }

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
    getReviewSortValue,
    'review_date',
    'desc'
  );

  // sortedReviews reste la liste COMPLÈTE (déjà triée) : naviguer dans un dossier ne fait que
  // choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste déjà
  // chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) = category_id
  // null.
  const currentFolderReviews = useMemo(
    () => sortedReviews.filter((review) => (review.category_id || null) === currentFolderId),
    [sortedReviews, currentFolderId]
  );

  function handleCreated(review) {
    setIsModalOpen(false);
    navigate(`/management-reviews/${review.id}`);
  }

  async function handleExportCsv(scopeIds) {
    const source = scopeIds ? reviews.filter((review) => scopeIds.includes(review.id)) : reviews;
    setExportingCsv(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'review_date', label: 'Date de revue' },
        { key: 'status', label: 'Statut' },
        { key: 'participants', label: 'Participants' },
      ];
      const rows = source.map((review) => ({
        title: review.title,
        review_date: formatDate(review.review_date),
        status: REVIEW_STATUS_LABELS[review.status] || review.status,
        participants: review.participants || '',
      }));
      await exportTableCsv(`revues-direction-${new Date().toISOString().slice(0, 10)}.csv`, 'Revues de direction', columns, rows, {
        generatedBy: currentUser?.full_name,
        subtitle: `${source.length} revue${source.length > 1 ? 's' : ''}`,
      });
    } catch {
      setExportPdfError('Impossible de générer le CSV.');
    } finally {
      setExportingCsv(false);
    }
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

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? reviews.filter((review) => scopeIds.includes(review.id)) : reviews;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'review_date', label: 'Date de revue' },
        { key: 'status', label: 'Statut' },
        { key: 'participants', label: 'Participants' },
      ];
      const rows = source.map((review) => ({
        title: review.title,
        review_date: formatDate(review.review_date),
        status: REVIEW_STATUS_LABELS[review.status] || review.status,
        participants: review.participants || '',
      }));
      await exportToXlsx(`revues-direction-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Revues de direction', columns, rows, {
        subtitle: `${source.length} revue${source.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? reviews.filter((review) => scopeIds.includes(review.id)) : reviews;
    setExportingWord(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'review_date', label: 'Date de revue' },
        { key: 'status', label: 'Statut' },
        { key: 'participants', label: 'Participants' },
      ];
      const rows = source.map((review) => ({
        title: review.title,
        review_date: formatDate(review.review_date),
        status: REVIEW_STATUS_LABELS[review.status] || review.status,
        participants: review.participants || '',
      }));
      await exportToWord(`revues-direction-${new Date().toISOString().slice(0, 10)}.docx`, 'Revues de direction', columns, rows, {
        subtitle: `${source.length} revue${source.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? reviews.filter((review) => scopeIds.includes(review.id)) : reviews;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'review_date', label: 'Date de revue' },
        { key: 'status', label: 'Statut' },
        { key: 'participants', label: 'Participants' },
      ];
      const rows = source.map((review) => ({
        title: review.title,
        review_date: formatDate(review.review_date),
        status: REVIEW_STATUS_LABELS[review.status] || review.status,
        participants: review.participants || '',
      }));
      await exportToDrive('REVDIR', 'Revues de direction', columns, rows, {
        subtitle: `${source.length} revue${source.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
      setDriveSuccess('Enregistré sur le Drive partagé.');
    } catch (err) {
      setExportPdfError(err.response?.data?.error || "Impossible d'enregistrer sur le Drive.");
    } finally {
      setExportingDrive(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Revues de direction</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportMenu
            disabled={reviews.length === 0}
            onExportCsv={() => handleExportCsv()}
            exportingCsv={exportingCsv}
            onExportPdf={() => handleExportPdf()}
            exportingPdf={exportingPdf}
            onExportXlsx={() => handleExportXlsx()}
            exportingXlsx={exportingXlsx}
            onExportWord={() => handleExportWord()}
            exportingWord={exportingWord}
            onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive() : undefined}
            exportingDrive={exportingDrive}
          />
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
      <PageGuide id="management-reviews" />

      <div className="mt-4">
        <SortSelect
          options={REVIEW_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Toutes les revues" />

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

      {canManage && (
        <SelectAllToggle ids={currentFolderReviews.map((review) => review.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedIds)}
          exportingCsv={exportingCsv}
          onExportPdf={() => handleExportPdf(selectedIds)}
          exportingPdf={exportingPdf}
          onExportXlsx={() => handleExportXlsx(selectedIds)}
          exportingXlsx={exportingXlsx}
          onExportWord={() => handleExportWord(selectedIds)}
          exportingWord={exportingWord}
          onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive(selectedIds) : undefined}
          exportingDrive={exportingDrive}
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
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}

      {loading || foldersLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          {(folders.length > 0 || currentUser?.role === 'admin') && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {folders.map((folder) => (
                <FolderTile key={folder.id} folder={folder} canManage={false} onOpen={() => navigateToFolder(folder.id)} />
              ))}
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <FolderPlus size={26} />
                  <span className="text-sm font-medium">Nouveau dossier</span>
                </button>
              )}
            </div>
          )}

          {reviews.length === 0 && folders.length === 0 ? (
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
          ) : currentFolderReviews.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucune revue directement dans ce dossier.' : 'Aucune revue sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {currentFolderReviews.map((review) => (
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{review.title}</p>
                    <p className="text-sm text-slate-500">{formatDate(review.review_date)}</p>
                    {canManage && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingReview(review);
                          }}
                          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <FolderInput size={12} />
                          Déplacer
                        </button>
                      </div>
                    )}
                  </div>
                  <ReviewStatusBadge status={review.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <NewReviewModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={REVIEW_RESOURCE_TYPE}
          endpoint="/management-reviews/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={REVIEW_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={REVIEW_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingReview && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={REVIEW_RESOURCE_TYPE}
          initialFolderId={movingReview.category_id || null}
          title="Déplacer"
          subtitle={movingReview.title}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingReview(null)}
          onSelect={handleMoveReview}
        />
      )}
    </div>
  );
}
