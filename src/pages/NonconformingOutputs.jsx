import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderCog, FolderInput, FolderPlus, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { NONCONFORMING_OUTPUT_STATUS_LABELS, NONCONFORMING_OUTPUT_DISPOSITION_LABELS } from '../lib/nonconformingOutputStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import NonconformingOutputStatusBadge from '../components/NonconformingOutputStatusBadge.jsx';
import NonconformingOutputDispositionBadge from '../components/NonconformingOutputDispositionBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
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
const OUTPUT_RESOURCE_TYPE = 'nonconforming_output';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const OUTPUT_SORT_OPTIONS = [
  { key: 'detected_at', label: 'date de détection' },
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
];

function getOutputSortValue(output, key) {
  return output[key];
}

// Modale de création — ouverte à tous les rôles côté backend (POST /nonconforming-outputs) :
// n'importe qui doit pouvoir signaler une non-conformité produit/service constatée, même
// principe que Accidents.jsx.
function NewOutputModal({ services, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    detected_at: new Date().toISOString().slice(0, 10),
    service_id: '',
    disposition: 'correction',
    customer_informed: false,
    category_id: '',
    category_name: '',
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
        categoryId = await resolvePersonalCategoryId('nonconforming_output');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      description: form.description,
      detected_at: form.detected_at,
      service_id: form.service_id || undefined,
      disposition: form.disposition,
      customer_informed: form.customer_informed,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/nonconforming-outputs', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de signaler cette non-conformité.');
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
          <h2 className="text-lg font-semibold text-slate-900">Signaler une non-conformité</h2>
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
              placeholder="Ex : Pièce hors tolérance au contrôle final"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de détection</label>
            <input
              type="date"
              required
              value={form.detected_at}
              onChange={(e) => updateField('detected_at', e.target.value)}
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Traitement envisagé</label>
            <select
              value={form.disposition}
              onChange={(e) => updateField('disposition', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(NONCONFORMING_OUTPUT_DISPOSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.customer_informed}
                onChange={(e) => updateField('customer_informed', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Client informé
            </label>
          </div>

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={OUTPUT_RESOURCE_TYPE}
            categoryName={form.category_name}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            onCategoryNameChange={(value) => updateField('category_name', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Signalement...' : 'Signaler la non-conformité'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NonconformingOutputs() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [outputs, setOutputs] = useState([]);
  const [services, setServices] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingOutput, setMovingOutput] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: OUTPUT_RESOURCE_TYPE });

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleMoveOutput(folderId) {
    const output = movingOutput;
    setMovingOutput(null);
    try {
      const { data } = await api.patch(`/nonconforming-outputs/${output.id}`, { category_id: folderId || null });
      setOutputs((prev) => prev.map((item) => (item.id === output.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette non-conformité.');
    }
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} non-conformité(s) sélectionnée(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/nonconforming-outputs/bulk', { data: { ids: selectedIds } });
      setOutputs((prev) => prev.filter((output) => !selectedIds.includes(output.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces non-conformités.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [outputsRes, servicesRes] = await Promise.all([
        api.get('/nonconforming-outputs', { params }),
        api.get('/services'),
      ]);
      setOutputs(outputsRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
    } catch {
      setError('Impossible de charger le registre des non-conformités produit/service.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const searchedOutputs = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return outputs;
    return outputs.filter(
      (output) => output.title.toLowerCase().includes(query) || (output.description || '').toLowerCase().includes(query)
    );
  }, [outputs, searchText]);

  const { sorted: sortedOutputs, sortKey, direction, setSortKey, toggleSort } = useSort(
    searchedOutputs,
    getOutputSortValue,
    'detected_at',
    'desc'
  );

  // sortedOutputs reste la liste COMPLÈTE (recherche + tri) : naviguer dans un dossier ne fait
  // que choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste déjà
  // chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) = category_id
  // null.
  const currentFolderOutputs = useMemo(
    () => sortedOutputs.filter((output) => (output.category_id || null) === currentFolderId),
    [sortedOutputs, currentFolderId]
  );
  // Miroir de DELETE /nonconforming-outputs/:id côté backend : admin/manager uniquement, sans
  // restriction créateur (contrairement à accidents.js) — voir le plan approuvé.
  const deletableIds = canManage ? currentFolderOutputs.map((output) => output.id) : [];

  function handleCreated(output) {
    setIsModalOpen(false);
    navigate(`/nonconforming-outputs/${output.id}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Non-conformités produit/service</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Signaler une non-conformité
        </button>
      </div>
      <PageGuide id="nonconforming-outputs" />

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="relative mt-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par titre ou description..."
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
          {Object.entries(NONCONFORMING_OUTPUT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={OUTPUT_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Toutes les non-conformités" />

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

          {outputs.length === 0 && folders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
              <p className="text-base font-medium text-slate-700">Aucune non-conformité produit/service enregistrée pour l'instant</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                <Plus size={18} />
                Signaler la première non-conformité
              </button>
            </div>
          ) : currentFolderOutputs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucune non-conformité directement dans ce dossier.' : 'Aucune non-conformité sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {currentFolderOutputs.map((output) => (
                <div
                  key={output.id}
                  onClick={() => navigate(`/nonconforming-outputs/${output.id}`)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(output.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(output.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{output.title}</p>
                      <p className="truncate text-sm text-slate-500">
                        {formatDate(output.detected_at)}
                        {output.service?.name ? ` · ${output.service.name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <NonconformingOutputDispositionBadge disposition={output.disposition} />
                      <NonconformingOutputStatusBadge status={output.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {output.customer_informed && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Client informé</span>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingOutput(output);
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <FolderInput size={12} />
                        Déplacer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <NewOutputModal services={services} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={OUTPUT_RESOURCE_TYPE}
          endpoint="/nonconforming-outputs/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={OUTPUT_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={OUTPUT_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingOutput && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={OUTPUT_RESOURCE_TYPE}
          initialFolderId={movingOutput.category_id || null}
          title="Déplacer"
          subtitle={movingOutput.title}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingOutput(null)}
          onSelect={handleMoveOutput}
        />
      )}
    </div>
  );
}
