import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Folder, FolderPlus, List, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { NONCONFORMING_OUTPUT_STATUS_LABELS, NONCONFORMING_OUTPUT_DISPOSITION_LABELS } from '../lib/nonconformingOutputStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import NonconformingOutputStatusBadge from '../components/NonconformingOutputStatusBadge.jsx';
import NonconformingOutputDispositionBadge from '../components/NonconformingOutputDispositionBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

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
function NewOutputModal({ services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    detected_at: new Date().toISOString().slice(0, 10),
    service_id: '',
    disposition: 'correction',
    customer_informed: false,
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
            {submitting ? 'Signalement...' : 'Signaler la non-conformité'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page, sans passer par
// Paramètres > Catégories — même modale que Accidents.jsx/Risks.jsx, adaptée à POST
// /module-categories (resource_type: 'nonconforming_output').
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
      ({ data } = await api.post('/module-categories', { resource_type: 'nonconforming_output', name, color }));
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

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex : Ligne 2, Retours clients 2026..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Couleur</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-16 rounded-md border border-slate-300" />
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

export default function NonconformingOutputs() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [outputs, setOutputs] = useState([]);
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
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
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

  function handleFolderCreated(category) {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    setIsNewFolderModalOpen(false);
    setExpandedFolders((prev) => new Set(prev).add(category.id));
  }

  async function handleCategoryChange(event, output) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(output.id);
    try {
      const { data } = await api.patch(`/nonconforming-outputs/${output.id}`, { category_id: categoryId });
      setOutputs((prev) => prev.map((item) => (item.id === output.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette non-conformité.');
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
      const [outputsRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/nonconforming-outputs', { params }),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'nonconforming_output' } }),
      ]);
      setOutputs(outputsRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
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

  // Un dossier par catégorie (module_categories, resource_type='nonconforming_output'), plus un
  // dossier "Sans dossier" en dernier — même principe que Accidents.jsx/Risks.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const output of sortedOutputs) {
      if (output.category_id && byCategory.has(output.category_id)) byCategory.get(output.category_id).push(output);
      else unfiled.push(output);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, outputs: byCategory.get(category.id) || [] }))
      .filter((group) => group.outputs.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, outputs: unfiled });
    return groups;
  }, [sortedOutputs, categories]);

  const isFolderView = viewMode === 'folder';
  const outputGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, outputs: sortedOutputs }];
  // Miroir de DELETE /nonconforming-outputs/:id côté backend : admin/manager uniquement, sans
  // restriction créateur (contrairement à accidents.js) — voir le plan approuvé.
  const deletableIds = canManage ? sortedOutputs.map((output) => output.id) : [];

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
      ) : outputs.length === 0 ? (
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
      ) : (
        <div className="mt-4 space-y-3">
          {outputGroups.map((group) => (
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
                  <span className="font-normal text-slate-400">({group.outputs.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.outputs.map((output) => (
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
                        <CategoryBadge category={output.category} />
                        {output.customer_informed && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Client informé</span>
                        )}
                        {canManage && (
                          <select
                            value={output.category_id || ''}
                            disabled={updatingCategoryId === output.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCategoryChange(e, output)}
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
        <NewOutputModal services={services} categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="nonconforming_output"
          endpoint="/nonconforming-outputs/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isNewFolderModalOpen && <NewFolderModal onClose={() => setIsNewFolderModalOpen(false)} onCreated={handleFolderCreated} />}
    </div>
  );
}
