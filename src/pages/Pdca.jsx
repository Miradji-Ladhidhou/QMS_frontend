import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, Folder, FolderPlus, List, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { PDCA_STATUS_LABELS } from '../lib/pdcaStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import PdcaStatusBadge from '../components/PdcaStatusBadge.jsx';
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

// Pas de statut "overdue" dédié en base (contrairement aux CAPA) — juste une date cible
// dépassée, calculée ici à l'affichage. Un projet déjà clôturé n'a plus de retard à signaler,
// même logique que isReviewOverdue dans Procedures.jsx.
function isTargetOverdue(pdca) {
  if (!pdca.target_date || pdca.status === 'closed') return false;
  return pdca.target_date < new Date().toISOString().slice(0, 10);
}

const PDCA_SORT_OPTIONS = [
  { key: 'title', label: 'titre' },
  { key: 'target_date', label: 'date cible' },
  { key: 'status', label: 'statut' },
];

function getPdcaSortValue(pdca, key) {
  return pdca[key];
}

// Miroir de DELETE /pdca/:id et DELETE /pdca/bulk côté backend : un manager qui n'a pas créé le
// projet n'a pas plus de droit de suppression qu'un member (contrairement à PATCH/advance).
function canDeletePdca(pdca, currentUser) {
  if (!pdca || !currentUser) return false;
  return currentUser.role === 'admin' || pdca.created_by === currentUser.id;
}

function NewPdcaModal({ users, services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    service_id: '',
    owner: '',
    target_date: '',
    plan_content: '',
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
        categoryId = await resolvePersonalCategoryId('pdca');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      description: form.description || undefined,
      service_id: form.service_id || undefined,
      owner: form.owner || undefined,
      target_date: form.target_date || undefined,
      plan_content: form.plan_content || undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/pdca', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer ce projet PDCA.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouveau projet PDCA</h2>
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
              placeholder="Ex : Réduire les rebuts en ligne 3"
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date cible</label>
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => updateField('target_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objectifs / actions planifiées (Plan)</label>
            <AutoTextarea
              rows={3}
              placeholder="Optionnel : vous pouvez déjà esquisser le plan, ou le compléter plus tard."
              value={form.plan_content}
              onChange={(e) => updateField('plan_content', e.target.value)}
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
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page PDCA, sans passer par
// Paramètres > Catégories — même modale que Risks.jsx/Capas.jsx, adaptée à POST
// /module-categories (resource_type: 'pdca').
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
      ({ data } = await api.post('/module-categories', { resource_type: 'pdca', name, color }));
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
                placeholder="Ex : Amélioration production, Amélioration qualité..."
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

export default function Pdca() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
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

  async function handleCategoryChange(event, pdca) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(pdca.id);
    try {
      const { data } = await api.patch(`/pdca/${pdca.id}`, { category_id: categoryId });
      setProjects((prev) => prev.map((item) => (item.id === pdca.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de ce projet.');
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
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} projet(s) PDCA sélectionné(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/pdca/bulk', { data: { ids: selectedIds } });
      setProjects((prev) => prev.filter((pdca) => !selectedIds.includes(pdca.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces projets.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (serviceFilter) params.service_id = serviceFilter;
      const [pdcaRes, usersRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/pdca', { params }),
        api.get('/users'),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'pdca' } }),
      ]);
      setProjects(pdcaRes.data);
      setUsers(usersRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les projets PDCA.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, serviceFilter]);

  const searchedProjects = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (pdca) => pdca.title.toLowerCase().includes(query) || (pdca.description || '').toLowerCase().includes(query)
    );
  }, [projects, searchText]);

  const { sorted: sortedProjects, sortKey, direction, setSortKey, toggleSort } = useSort(
    searchedProjects,
    getPdcaSortValue,
    'target_date',
    'asc'
  );

  // Un dossier par catégorie (module_categories, resource_type='pdca'), plus un dossier "Sans
  // dossier" en dernier pour les projets non classés — jamais affiché s'il est vide. Reprend
  // sortedProjects (déjà trié/filtré) pour que le mode dossier reste cohérent avec le mode
  // liste, même principe que Risks.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const pdca of sortedProjects) {
      if (pdca.category_id && byCategory.has(pdca.category_id)) byCategory.get(pdca.category_id).push(pdca);
      else unfiled.push(pdca);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, projects: byCategory.get(category.id) || [] }))
      .filter((group) => group.projects.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, projects: unfiled });
    return groups;
  }, [sortedProjects, categories]);

  const isFolderView = viewMode === 'folder';
  const pdcaGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, projects: sortedProjects }];
  const deletableIds = sortedProjects.filter((pdca) => canDeletePdca(pdca, currentUser)).map((pdca) => pdca.id);

  function handleCreated(pdca) {
    setIsModalOpen(false);
    navigate(`/pdca/${pdca.id}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">PDCA — Amélioration continue</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouveau projet PDCA
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
          {Object.entries(PDCA_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les services</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>

        <SortSelect options={PDCA_SORT_OPTIONS} sortKey={sortKey} direction={direction} onChangeKey={setSortKey} onToggleDirection={() => toggleSort(sortKey)} />
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

      {(canManage || deletableIds.length > 0) && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={canManage ? () => setIsBulkMoveModalOpen(true) : undefined}
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
      ) : projects.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucun projet PDCA enregistré pour l'instant</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Créer le premier projet
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {pdcaGroups.map((group) => (
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
                  <span className="font-normal text-slate-400">({group.projects.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.projects.map((pdca) => {
                    const overdue = isTargetOverdue(pdca);
                    return (
                      <div
                        key={pdca.id}
                        onClick={() => navigate(`/pdca/${pdca.id}`)}
                        className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md ${
                          overdue ? 'border-red-300' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {canDeletePdca(pdca, currentUser) && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(pdca.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelect(pdca.id)}
                              className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900">{pdca.title}</p>
                            <p className={`truncate text-sm ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                              {overdue && <AlertTriangle size={14} className="mr-1 inline" />}
                              {pdca.service?.name ? `${pdca.service.name} · ` : ''}
                              {pdca.owner_user ? `${pdca.owner_user.full_name} · ` : ''}
                              {pdca.target_date ? `Cible : ${formatDate(pdca.target_date)}` : 'Sans date cible'}
                            </p>
                          </div>
                          <PdcaStatusBadge status={pdca.status} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <CategoryBadge category={pdca.category} />
                          {canManage && (
                            <select
                              value={pdca.category_id || ''}
                              disabled={updatingCategoryId === pdca.id}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleCategoryChange(e, pdca)}
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
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewPdcaModal users={users} services={services} categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="pdca"
          endpoint="/pdca/bulk-category"
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
