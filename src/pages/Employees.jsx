import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Ban, CheckCircle2, ChevronDown, ChevronUp, Folder, FolderCog, List, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import CategoryBadge from '../components/CategoryBadge.jsx';
import SortSelect from '../components/SortSelect.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import PageGuide from '../components/PageGuide.jsx';

const EMPLOYEE_SORT_OPTIONS = [
  { key: 'full_name', label: 'nom' },
  { key: 'is_active', label: 'statut' },
];

function EmployeeModal({ employee, categories, onClose, onSaved }) {
  const isNew = !employee;
  const [fullName, setFullName] = useState(employee?.full_name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [jobTitle, setJobTitle] = useState(employee?.job_title || '');
  const [categoryId, setCategoryId] = useState(employee?.category_id || '');
  const [isActive, setIsActive] = useState(employee?.is_active ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    // onSaved() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = isNew
        ? await api.post('/employees', {
            full_name: fullName,
            email: email || undefined,
            job_title: jobTitle || undefined,
            category_id: categoryId || undefined,
          })
        : await api.patch(`/employees/${employee.id}`, {
            full_name: fullName,
            email: email || null,
            job_title: jobTitle || null,
            category_id: categoryId || null,
            is_active: isActive,
          });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer cette entrée.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isNew ? 'Nouvelle personne' : 'Modifier'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom complet</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email (optionnel)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fonction (optionnel)</label>
            <input
              type="text"
              placeholder="Affichée sur la fiche de participation aux formations"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dossier</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Sans dossier</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {!isNew && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Personne active
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EmployeeCard({ employee, categories, updatingCategoryId, togglingId, deletingId, onToggleActive, onEdit, onDelete, onCategoryChange }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
        employee.is_active ? '' : 'opacity-60'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{employee.full_name}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                employee.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {employee.is_active ? <CheckCircle2 size={12} /> : <Ban size={12} />}
              {employee.is_active ? 'Actif' : 'Inactif'}
            </span>
          </div>
          {employee.email && <p className="mt-0.5 text-sm text-slate-500">{employee.email}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleActive(employee)}
            disabled={togglingId === employee.id}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              employee.is_active
                ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'bg-primary text-white hover:bg-primary-700'
            }`}
          >
            <Ban size={14} />
            {employee.is_active ? 'Désactiver' : 'Réactiver'}
          </button>
          <button
            type="button"
            onClick={() => onEdit(employee)}
            aria-label="Modifier"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(employee)}
            disabled={deletingId === employee.id}
            aria-label="Supprimer"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-60"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={employee.category} />
        <select
          value={employee.category_id || ''}
          disabled={updatingCategoryId === employee.id}
          onChange={(e) => onCategoryChange(e, employee)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Sans dossier</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function Employees() {
  const currentUser = useCurrentUser();
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);
  const { sorted: sortedEmployees, sortKey, direction, setSortKey, toggleSort } = useSort(
    employees,
    (employee, key) => employee[key],
    'full_name',
    'asc'
  );

  async function loadEmployees() {
    setLoading(true);
    setError('');
    try {
      const [employeesRes, categoriesRes] = await Promise.all([
        api.get('/employees'),
        api.get('/module-categories', { params: { resource_type: 'employee' } }),
      ]);
      setEmployees(employeesRes.data);
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger le personnel.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadEmployees();
    }
  }, [currentUser?.role]);

  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  function toggleFolder(key) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleCreated(employee) {
    setEmployees((prev) => [...prev, employee].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setIsCreating(false);
  }

  function handleUpdated(updated) {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditing(null);
  }

  async function handleToggleActive(employee) {
    setTogglingId(employee.id);
    setError('');
    try {
      const { data } = await api.patch(`/employees/${employee.id}`, { is_active: !employee.is_active });
      setEmployees((prev) => prev.map((e) => (e.id === employee.id ? data : e)));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour cette entrée.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCategoryChange(event, employee) {
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(employee.id);
    try {
      const { data } = await api.patch(`/employees/${employee.id}`, { category_id: categoryId });
      setEmployees((prev) => prev.map((e) => (e.id === employee.id ? data : e)));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de changer le dossier de cette personne.');
    } finally {
      setUpdatingCategoryId(null);
    }
  }

  async function handleDelete(employee) {
    if (!window.confirm(`Supprimer définitivement "${employee.full_name}" du personnel suivi ?`)) return;

    setDeletingId(employee.id);
    setError('');
    try {
      await api.delete(`/employees/${employee.id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer cette entrée.');
    } finally {
      setDeletingId(null);
    }
  }

  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const employee of sortedEmployees) {
      if (employee.category_id && byCategory.has(employee.category_id)) byCategory.get(employee.category_id).push(employee);
      else unfiled.push(employee);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, employees: byCategory.get(category.id) || [] }))
      .filter((group) => group.employees.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, employees: unfiled });
    return groups;
  }, [sortedEmployees, categories]);

  const isFolderView = viewMode === 'folder';
  const employeeGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, employees: sortedEmployees }];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Personnel</h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouvelle personne
        </button>
      </div>
      <PageGuide id="employees" />

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {employees.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
            <button
              type="button"
              onClick={() => setIsManageCategoriesOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <FolderCog size={16} />
              Gérer les dossiers
            </button>
          </div>

          <SortSelect
            options={EMPLOYEE_SORT_OPTIONS}
            sortKey={sortKey}
            direction={direction}
            onChangeKey={setSortKey}
            onToggleDirection={() => toggleSort(sortKey)}
          />
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune personne enregistrée pour l'instant.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {employeeGroups.map((group) => (
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
                  <span className="font-normal text-slate-400">({group.employees.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`grid gap-3 sm:grid-cols-2 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.employees.map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      categories={categories}
                      updatingCategoryId={updatingCategoryId}
                      togglingId={togglingId}
                      deletingId={deletingId}
                      onToggleActive={handleToggleActive}
                      onEdit={setEditing}
                      onDelete={handleDelete}
                      onCategoryChange={handleCategoryChange}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isCreating && <EmployeeModal categories={categories} onClose={() => setIsCreating(false)} onSaved={handleCreated} />}
      {editing && (
        <EmployeeModal employee={editing} categories={categories} onClose={() => setEditing(null)} onSaved={handleUpdated} />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl="/module-categories"
          resourceType="employee"
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={loadEmployees}
        />
      )}
    </div>
  );
}
