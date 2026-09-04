import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, Folder, FolderPlus, List, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { exportToCsv } from '../lib/csvExport.js';
import { QQOQCCP_STATUS_LABELS } from '../lib/qqoqccpStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import QqoqccpStatusBadge from '../components/QqoqccpStatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const QQOQCCP_SORT_OPTIONS = [
  { key: 'created_at', label: 'date de création' },
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
];

function NewAnalysisModal({ categories, onClose, onCreated }) {
  const [title, setTitle] = useState('');
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
            {submitting ? 'Création...' : "Créer l'analyse"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page QQOQCCP, sans passer par
// Paramètres > Catégories — juste nom + couleur, même modale que Capas.jsx (voir
// NewFolderModal là-bas), adaptée à POST /module-categories (resource_type: 'qqoqccp').
function NewFolderModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1F3864');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let data;
    try {
      ({ data } = await api.post('/module-categories', { resource_type: 'qqoqccp', name, color }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer ce dossier.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau dossier</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex : Sécurité alimentaire, Non-conformités process..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Couleur</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-16 rounded-md border border-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer le dossier'}
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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);

  // Miroir exact du gate côté backend (PATCH /api/qqoqccp/:id, qqoqccp.js) : admin/manager
  // modifient toute analyse, un member seulement la sienne tant qu'elle n'est pas validée.
  function canEditAnalysis(analysis) {
    if (canManage) return true;
    return analysis.created_by === currentUser?.id && analysis.status !== 'validated';
  }

  function toggleFolder(key) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleFolderCreated(category) {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    setIsNewFolderModalOpen(false);
    setExpandedFolders((prev) => new Set(prev).add(category.id));
  }

  async function handleCategoryChange(event, analysis) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(analysis.id);
    try {
      const { data } = await api.patch(`/qqoqccp/${analysis.id}`, { category_id: categoryId });
      setAnalyses((prev) => prev.map((item) => (item.id === analysis.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette analyse.');
    } finally {
      setUpdatingCategoryId(null);
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
    api
      .get('/module-categories', { params: { resource_type: 'qqoqccp' } })
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

  // Un dossier par catégorie (module_categories, resource_type='qqoqccp'), plus un dossier
  // "Sans dossier" en dernier pour les analyses non classées — jamais affiché s'il est vide.
  // Reprend sortedAnalyses (déjà trié) pour que le mode dossier reste cohérent avec le mode
  // liste, même principe que Capas.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const analysis of sortedAnalyses) {
      if (analysis.category_id && byCategory.has(analysis.category_id)) byCategory.get(analysis.category_id).push(analysis);
      else unfiled.push(analysis);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, analyses: byCategory.get(category.id) || [] }))
      .filter((group) => group.analyses.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, analyses: unfiled });
    return groups;
  }, [sortedAnalyses, categories]);

  const isFolderView = viewMode === 'folder';
  const analysisGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, analyses: sortedAnalyses }];

  function handleCreated(analysis) {
    setIsModalOpen(false);
    navigate(`/qqoqccp/${analysis.id}`);
  }

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? analyses.filter((analysis) => scopeIds.includes(analysis.id)) : analyses;
    const headers = ['Titre', 'Statut', 'Créée le'];
    const rows = source.map((analysis) => [
      analysis.title,
      QQOQCCP_STATUS_LABELS[analysis.status] || analysis.status,
      formatDate(analysis.created_at),
    ]);
    exportToCsv(`qqoqccp-${new Date().toISOString().slice(0, 10)}.csv`, 'QQOQCCP', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: `${source.length} analyse${source.length > 1 ? 's' : ''}`,
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">QQOQCCP</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={analyses.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
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
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderPlus size={16} />
            Nouveau dossier
          </button>
        )}
      </div>

      {canManage && (
        <SelectAllToggle
          ids={sortedAnalyses.map((analysis) => analysis.id)}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedIds)}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
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
      ) : (
        <div className="mt-4 space-y-3">
          {analysisGroups.map((group) => (
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
                  <span className="font-normal text-slate-400">({group.analyses.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.analyses.map((analysis) => (
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
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={analysis.category} />
                        {canEditAnalysis(analysis) && (
                          <select
                            value={analysis.category_id || ''}
                            disabled={updatingCategoryId === analysis.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCategoryChange(e, analysis)}
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
        <NewAnalysisModal categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="qqoqccp"
          endpoint="/qqoqccp/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isNewFolderModalOpen && (
        <NewFolderModal onClose={() => setIsNewFolderModalOpen(false)} onCreated={handleFolderCreated} />
      )}
    </div>
  );
}
