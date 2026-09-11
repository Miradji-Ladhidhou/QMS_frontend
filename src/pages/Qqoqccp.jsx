import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileType, FolderCog, FolderInput, FolderPlus, Loader2, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { exportTableCsv, exportToWord } from '../lib/pdfExport.js';
import { QQOQCCP_STATUS_LABELS } from '../lib/qqoqccpStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import QqoqccpStatusBadge from '../components/QqoqccpStatusBadge.jsx';
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
import PageGuide from '../components/PageGuide.jsx';

const CATEGORIES_BASE_URL = '/module-categories';
const QQOQCCP_RESOURCE_TYPE = 'qqoqccp';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const QQOQCCP_SORT_OPTIONS = [
  { key: 'created_at', label: 'date de création' },
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
];

function NewAnalysisModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
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
        finalCategoryId = await resolvePersonalCategoryId('qqoqccp');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/qqoqccp', { title, category_id: finalCategoryId });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer l'analyse.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle analyse</h2>
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
              placeholder="Ex : Rupture de stock composant X"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={QQOQCCP_RESOURCE_TYPE}
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
            {submitting ? 'Création...' : "Créer l'analyse"}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function Qqoqccp() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingAnalysis, setMovingAnalysis] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: QQOQCCP_RESOURCE_TYPE });

  // Miroir exact du gate côté backend (PATCH /api/qqoqccp/:id, qqoqccp.js) : admin/manager
  // modifient toute analyse, un member seulement la sienne tant qu'elle n'est pas validée.
  function canEditAnalysis(analysis) {
    if (canManage) return true;
    return analysis.created_by === currentUser?.id && analysis.status !== 'validated';
  }

  async function handleMoveAnalysis(folderId) {
    const analysis = movingAnalysis;
    setMovingAnalysis(null);
    try {
      const { data } = await api.patch(`/qqoqccp/${analysis.id}`, { category_id: folderId || null });
      setAnalyses((prev) => prev.map((item) => (item.id === analysis.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette analyse.');
    }
  }

  function loadAnalyses() {
    setLoading(true);
    api
      .get('/qqoqccp')
      .then(({ data }) => setAnalyses(data))
      .catch(() => setError('Impossible de charger les analyses QQOQCCP.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAnalyses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadAnalyses();
  }

  async function handleBulkDelete() {
    if (
      !window.confirm(`Supprimer définitivement ${selectedIds.length} analyse(s) sélectionnée(s) ? Cette action est irréversible.`)
    ) {
      return;
    }
    try {
      await api.delete('/qqoqccp/bulk', { data: { ids: selectedIds } });
      setAnalyses((prev) => prev.filter((analysis) => !selectedIds.includes(analysis.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces analyses.');
    }
  }

  const { sorted: sortedAnalyses, sortKey, direction, setSortKey, toggleSort } = useSort(
    analyses,
    (analysis, key) => analysis[key],
    'created_at',
    'desc'
  );

  // sortedAnalyses reste la liste COMPLÈTE (déjà triée) : naviguer dans un dossier ne fait que
  // choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste déjà
  // chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) = category_id
  // null.
  const currentFolderAnalyses = useMemo(
    () => sortedAnalyses.filter((analysis) => (analysis.category_id || null) === currentFolderId),
    [sortedAnalyses, currentFolderId]
  );

  function handleCreated(analysis) {
    setIsModalOpen(false);
    navigate(`/qqoqccp/${analysis.id}`);
  }

  async function handleExportCsv(scopeIds) {
    const source = scopeIds ? analyses.filter((analysis) => scopeIds.includes(analysis.id)) : analyses;
    setExportingCsv(true);
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'status', label: 'Statut' },
        { key: 'created_at', label: 'Créée le' },
      ];
      const rows = source.map((analysis) => ({
        title: analysis.title,
        status: QQOQCCP_STATUS_LABELS[analysis.status] || analysis.status,
        created_at: formatDate(analysis.created_at),
      }));
      await exportTableCsv(`qqoqccp-${new Date().toISOString().slice(0, 10)}.csv`, 'QQOQCCP', columns, rows, {
        generatedBy: currentUser?.full_name,
        subtitle: `${source.length} analyse${source.length > 1 ? 's' : ''}`,
      });
    } catch {
      setError('Impossible de générer le CSV.');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? analyses.filter((analysis) => scopeIds.includes(analysis.id)) : analyses;
    setExportingWord(true);
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'status', label: 'Statut' },
        { key: 'created_at', label: 'Créée le' },
      ];
      const rows = source.map((analysis) => ({
        title: analysis.title,
        status: QQOQCCP_STATUS_LABELS[analysis.status] || analysis.status,
        created_at: formatDate(analysis.created_at),
      }));
      await exportToWord(`qqoqccp-${new Date().toISOString().slice(0, 10)}.docx`, 'QQOQCCP', columns, rows, {
        generatedBy: currentUser?.full_name,
        subtitle: `${source.length} analyse${source.length > 1 ? 's' : ''}`,
      });
    } catch {
      setError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">QQOQCCP</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={analyses.length === 0 || exportingCsv}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingCsv ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportWord()}
            disabled={analyses.length === 0 || exportingWord}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingWord ? <Loader2 size={18} className="animate-spin" /> : <FileType size={18} />}
            Exporter Word
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouvelle analyse
          </button>
        </div>
      </div>
      <PageGuide id="qqoqccp" />

      <div className="mt-4">
        <SortSelect
          options={QQOQCCP_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Toutes les analyses" />

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
        <SelectAllToggle
          ids={currentFolderAnalyses.map((analysis) => analysis.id)}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedIds)}
          exportingCsv={exportingCsv}
          onExportWord={() => handleExportWord(selectedIds)}
          exportingWord={exportingWord}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
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

          {analyses.length === 0 && folders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
              <p className="text-base font-medium text-slate-700">Aucune analyse QQOQCCP pour l'instant</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Créez votre première analyse pour structurer un problème avec la méthode Qui/Quoi/Où/Quand/Comment/Combien/Pourquoi.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                <Plus size={18} />
                Nouvelle analyse
              </button>
            </div>
          ) : currentFolderAnalyses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucune analyse directement dans ce dossier.' : 'Aucune analyse sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {currentFolderAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  onClick={() => navigate(`/qqoqccp/${analysis.id}`)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(analysis.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(analysis.id)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{analysis.title}</p>
                        <p className="text-sm text-slate-500">{formatDate(analysis.created_at)}</p>
                      </div>
                    </div>
                    <QqoqccpStatusBadge status={analysis.status} />
                  </div>
                  {canEditAnalysis(analysis) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingAnalysis(analysis);
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <FolderInput size={12} />
                        Déplacer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <NewAnalysisModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={QQOQCCP_RESOURCE_TYPE}
          endpoint="/qqoqccp/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={QQOQCCP_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={QQOQCCP_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingAnalysis && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={QQOQCCP_RESOURCE_TYPE}
          initialFolderId={movingAnalysis.category_id || null}
          title="Déplacer"
          subtitle={movingAnalysis.title}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingAnalysis(null)}
          onSelect={handleMoveAnalysis}
        />
      )}
    </div>
  );
}
