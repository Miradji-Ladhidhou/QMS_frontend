import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, Folder, FolderCog, List, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import CategoryBadge from '../components/CategoryBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Pas de statut "overdue" dédié en base — juste une échéance dépassée, calculée ici à
// l'affichage. Un équipement désactivé n'a plus de retard à signaler, même logique que
// isTargetOverdue dans QualityObjectives.jsx.
function isCalibrationOverdue(equipment) {
  if (!equipment.next_calibration_date || !equipment.is_active) return false;
  return equipment.next_calibration_date < new Date().toISOString().slice(0, 10);
}

const EQUIPMENT_SORT_OPTIONS = [
  { key: 'name', label: 'nom' },
  { key: 'next_calibration_date', label: 'prochaine échéance' },
];

function getEquipmentSortValue(equipment, key) {
  return equipment[key];
}

function NewEquipmentModal({ services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    identifier: '',
    category: '',
    service_id: '',
    next_calibration_date: '',
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
        categoryId = await resolvePersonalCategoryId('measuring_equipment');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      name: form.name,
      identifier: form.identifier || undefined,
      category: form.category || undefined,
      service_id: form.service_id || undefined,
      next_calibration_date: form.next_calibration_date || undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/measuring-equipment', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer cet équipement.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouvel équipement de mesure</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              type="text"
              required
              placeholder="Ex : Pied à coulisse atelier 2"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Identifiant / N° de série</label>
              <input
                type="text"
                value={form.identifier}
                onChange={(e) => updateField('identifier', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <input
                type="text"
                placeholder="Ex : Instrument de mesure dimensionnelle"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Prochain étalonnage</label>
              <input
                type="date"
                value={form.next_calibration_date}
                onChange={(e) => updateField('next_calibration_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
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
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function MeasuringEquipment() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [equipmentList, setEquipmentList] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
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
  async function handleCategoryChange(event, equipment) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(equipment.id);
    try {
      const { data } = await api.patch(`/measuring-equipment/${equipment.id}`, { category_id: categoryId });
      setEquipmentList((prev) => prev.map((item) => (item.id === equipment.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cet équipement.');
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
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} équipement(s) sélectionné(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/measuring-equipment/bulk', { data: { ids: selectedIds } });
      setEquipmentList((prev) => prev.filter((equipment) => !selectedIds.includes(equipment.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces équipements.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (activeFilter) params.is_active = activeFilter;
      const [equipmentRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/measuring-equipment', { params }),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'measuring_equipment' } }),
      ]);
      setEquipmentList(equipmentRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les équipements de mesure.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const searchedEquipment = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return equipmentList;
    return equipmentList.filter(
      (equipment) => equipment.name.toLowerCase().includes(query) || (equipment.identifier || '').toLowerCase().includes(query)
    );
  }, [equipmentList, searchText]);

  const { sorted: sortedEquipment, sortKey, direction, setSortKey, toggleSort } = useSort(
    searchedEquipment,
    getEquipmentSortValue,
    'next_calibration_date',
    'asc'
  );

  // Un dossier par catégorie (module_categories, resource_type='measuring_equipment'), plus un
  // dossier "Sans dossier" en dernier — même principe que QualityObjectives.jsx/Pdca.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const equipment of sortedEquipment) {
      if (equipment.category_id && byCategory.has(equipment.category_id)) byCategory.get(equipment.category_id).push(equipment);
      else unfiled.push(equipment);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, equipment: byCategory.get(category.id) || [] }))
      .filter((group) => group.equipment.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, equipment: unfiled });
    return groups;
  }, [sortedEquipment, categories]);

  const isFolderView = viewMode === 'folder';
  const equipmentGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, equipment: sortedEquipment }];
  // Miroir de DELETE /measuring-equipment/:id côté backend : admin/manager uniquement, sans
  // restriction créateur — même principe que risks.js/quality-objectives.
  const deletableIds = canManage ? sortedEquipment.map((equipment) => equipment.id) : [];

  function handleCreated(equipment) {
    setIsModalOpen(false);
    navigate(`/measuring-equipment/${equipment.id}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Étalonnage des équipements de mesure</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Nouvel équipement
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="relative mt-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom ou identifiant..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les équipements</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>

        <SortSelect
          options={EQUIPMENT_SORT_OPTIONS}
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
      ) : equipmentList.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucun équipement de mesure enregistré pour l'instant</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Créer le premier équipement
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {equipmentGroups.map((group) => (
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
                  <span className="font-normal text-slate-400">({group.equipment.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.equipment.map((equipment) => {
                    const overdue = isCalibrationOverdue(equipment);
                    return (
                      <div
                        key={equipment.id}
                        onClick={() => navigate(`/measuring-equipment/${equipment.id}`)}
                        className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md ${
                          overdue ? 'border-red-300' : 'border-slate-200'
                        } ${!equipment.is_active ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {canManage && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(equipment.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelect(equipment.id)}
                              className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900">
                              {equipment.name}
                              {!equipment.is_active && <span className="ml-2 text-xs font-normal text-slate-400">(inactif)</span>}
                            </p>
                            <p className={`truncate text-sm ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                              {overdue && <AlertTriangle size={14} className="mr-1 inline" />}
                              {equipment.identifier ? `${equipment.identifier} · ` : ''}
                              {equipment.service?.name ? `${equipment.service.name} · ` : ''}
                              {equipment.next_calibration_date
                                ? `Prochain étalonnage : ${formatDate(equipment.next_calibration_date)}`
                                : 'Sans échéance'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <CategoryBadge category={equipment.category} />
                          {canManage && (
                            <select
                              value={equipment.category_id || ''}
                              disabled={updatingCategoryId === equipment.id}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleCategoryChange(e, equipment)}
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
        <NewEquipmentModal services={services} categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="measuring_equipment"
          endpoint="/measuring-equipment/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && <ManageCategoriesModal
          baseUrl="/module-categories"
          resourceType="measuring_equipment"
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={loadData}
        />}
    </div>
  );
}
