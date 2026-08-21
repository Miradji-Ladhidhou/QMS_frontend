import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Ban, CheckCircle2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import SortSelect from '../components/SortSelect.jsx';

const EMPLOYEE_SORT_OPTIONS = [
  { key: 'full_name', label: 'nom' },
  { key: 'is_active', label: 'statut' },
];

function EmployeeModal({ employee, onClose, onSaved }) {
  const isNew = !employee;
  const [fullName, setFullName] = useState(employee?.full_name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [isActive, setIsActive] = useState(employee?.is_active ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (isNew) {
        const { data } = await api.post('/employees', { full_name: fullName, email: email || undefined });
        onSaved(data);
      } else {
        const { data } = await api.patch(`/employees/${employee.id}`, {
          full_name: fullName,
          email: email || null,
          is_active: isActive,
        });
        onSaved(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer cette entrée.");
    } finally {
      setSaving(false);
    }
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

export default function Employees() {
  const currentUser = useCurrentUser();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
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
      const { data } = await api.get('/employees');
      setEmployees(data);
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Personnel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Salariés suivis pour les formations sans avoir de compte QMS SaaS.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouvelle personne
        </button>
      </div>

      {employees.length > 0 && (
        <div className="mt-4">
          <SortSelect
            options={EMPLOYEE_SORT_OPTIONS}
            sortKey={sortKey}
            direction={direction}
            onChangeKey={setSortKey}
            onToggleDirection={() => toggleSort(sortKey)}
          />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
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
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {sortedEmployees.map((employee) => (
            <li key={employee.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                  onClick={() => handleToggleActive(employee)}
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
                  onClick={() => setEditing(employee)}
                  aria-label="Modifier"
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(employee)}
                  disabled={deletingId === employee.id}
                  aria-label="Supprimer"
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-60"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isCreating && <EmployeeModal onClose={() => setIsCreating(false)} onSaved={handleCreated} />}
      {editing && <EmployeeModal employee={editing} onClose={() => setEditing(null)} onSaved={handleUpdated} />}
    </div>
  );
}
