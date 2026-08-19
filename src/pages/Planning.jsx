import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  Circle,
  ClipboardList,
  Download,
  Filter,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf } from '../lib/pdfExport.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';

const TYPE_CONFIG = {
  capa: { label: 'CAPA', icon: ClipboardList, className: 'bg-blue-100 text-blue-700' },
  document: { label: 'Document', icon: FileText, className: 'bg-purple-100 text-purple-700' },
  training: { label: 'Formation', icon: GraduationCap, className: 'bg-emerald-100 text-emerald-700' },
  task: { label: 'Tâche', icon: CheckSquare, className: 'bg-amber-100 text-amber-700' },
};

function formatDateHeading(dateStr) {
  const label = new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function canEditTask(task, currentUser) {
  if (!task || !currentUser) return false;
  return isManagerRole(currentUser.role) || task.created_by === currentUser.id || task.assigned_to === currentUser.id;
}

function canDeleteTask(task, currentUser) {
  if (!task || !currentUser) return false;
  return isManagerRole(currentUser.role) || task.created_by === currentUser.id;
}

function TaskFormModal({ task, users, employees, onClose, onSaved }) {
  const isEditing = Boolean(task);
  const initialSource = task?.assigned_to ? 'user' : task?.assigned_employee_id ? 'employee' : 'none';

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.due_date || new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState(initialSource);
  const [personId, setPersonId] = useState(task?.assigned_to || task?.assigned_employee_id || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSourceChange(next) {
    setSource(next);
    setPersonId('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const assignment =
      source === 'user'
        ? { assigned_to: personId, assigned_employee_id: null }
        : source === 'employee'
          ? { assigned_to: null, assigned_employee_id: personId }
          : { assigned_to: null, assigned_employee_id: null };

    try {
      if (isEditing) {
        const { data } = await api.patch(`/tasks/${task.id}`, {
          title,
          description: description || null,
          due_date: dueDate,
          ...assignment,
        });
        onSaved(data);
      } else {
        const { data } = await api.post('/tasks', { title, description: description || undefined, due_date: dueDate, ...assignment });
        onSaved(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer cette tâche.");
    } finally {
      setSubmitting(false);
    }
  }

  const options = source === 'user' ? users : source === 'employee' ? employees : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Échéance</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assigner à</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'none', label: 'Personne' },
                { value: 'user', label: 'Un compte' },
                { value: 'employee', label: 'Personnel' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSourceChange(option.value)}
                  className={`rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
                    source === option.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {source !== 'none' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {source === 'user' ? 'Utilisateur' : 'Personne'}
              </label>
              <select
                required
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Sélectionner...</option>
                {options.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer la tâche'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Planning() {
  const currentUser = useCurrentUser();
  const role = currentUser?.role;
  const canFilterByService = role === 'admin' || role === 'manager';

  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState('');

  async function loadPlanning(serviceIds) {
    setError('');
    try {
      const [planningRes, tasksRes] = await Promise.all([
        api.get('/planning', { params: serviceIds.length > 0 ? { service_id: serviceIds } : {} }),
        api.get('/tasks'),
      ]);
      setItems(planningRes.data.items);
      setTasks(tasksRes.data);
    } catch {
      setError('Impossible de charger le planning.');
    }
  }

  useEffect(() => {
    if (!role) return;

    let cancelled = false;

    async function init() {
      setLoading(true);

      try {
        const [usersRes, employeesRes] = await Promise.all([api.get('/users'), api.get('/employees')]);
        if (!cancelled) {
          setUsers(usersRes.data);
          setEmployees(employeesRes.data.filter((employee) => employee.is_active));
        }
      } catch {
        // Non bloquant : le formulaire de tâche fonctionne sans assigné si ces listes échouent.
      }

      if (role !== 'member') {
        try {
          const { data } = await api.get('/services');
          if (!cancelled) setAllServices(data.filter((service) => service.is_active));
        } catch {
          // Idem : sélecteur de service vide si indisponible, non bloquant.
        }
      }

      let initialSelected = [];
      if (role === 'manager') {
        try {
          const { data } = await api.get('/services/my-services');
          if (!cancelled) initialSelected = data.map((service) => service.id);
        } catch {
          // Pas de présélection si l'appel échoue.
        }
      }

      if (cancelled) return;
      setSelectedServiceIds(initialSelected);
      await loadPlanning([]);
      if (!cancelled) setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function handleToggleService(serviceId) {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      loadPlanning(next);
      return next;
    });
  }

  async function handleMarkDone(item) {
    try {
      await api.patch(`/tasks/${item.id}`, { status: 'done' });
      await loadPlanning(selectedServiceIds);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de marquer cette tâche comme terminée.');
    }
  }

  async function handleDeleteTask(item) {
    if (!window.confirm(`Supprimer définitivement la tâche "${item.title}" ?`)) return;

    try {
      await api.delete(`/tasks/${item.id}`);
      await loadPlanning(selectedServiceIds);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer cette tâche.');
    }
  }

  async function handleTaskSaved() {
    setIsNewModalOpen(false);
    setEditingTaskId(null);
    await loadPlanning(selectedServiceIds);
  }

  const editingTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : null;

  const grouped = items.reduce((acc, item) => {
    (acc[item.date] ||= []).push(item);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();

  function handleExportCsv() {
    const headers = ['Date', 'Type', 'Titre', 'En retard'];
    const rows = items.map((item) => [item.date, TYPE_CONFIG[item.type].label, item.title, item.is_overdue ? 'Oui' : 'Non']);
    exportToCsv(`planning-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'date', label: 'Date', width: 0.15 },
        { key: 'type', label: 'Type', width: 0.2 },
        { key: 'title', label: 'Titre', width: 0.5 },
        { key: 'overdue', label: 'En retard', width: 0.15 },
      ];
      const rows = items.map((item) => ({
        date: item.date,
        type: TYPE_CONFIG[item.type].label,
        title: item.title,
        overdue: item.is_overdue ? 'Oui' : 'Non',
      }));
      await exportToPdf(`planning-${new Date().toISOString().slice(0, 10)}.pdf`, 'Planning', columns, rows, {
        subtitle: `${items.length} élément${items.length > 1 ? 's' : ''}`,
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
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Planning</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={items.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || items.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouvelle tâche
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertTriangle size={16} />
          {error}
        </p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}

      {canFilterByService && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter size={16} />
            Filtrer par service
          </div>

          {allServices.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun service configuré.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allServices.map((service) => {
                const checked = selectedServiceIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleService(service.id)}
                      className="sr-only"
                    />
                    {checked && <Check size={14} />}
                    {service.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : dates.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Rien à venir pour l'instant.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <h2 className="mb-2 text-sm font-semibold text-slate-500">{formatDateHeading(date)}</h2>
              <div className="space-y-2">
                {grouped[date].map((item) => {
                  const config = TYPE_CONFIG[item.type];
                  const Icon = config.icon;
                  const isTask = item.type === 'task';
                  const editable = isTask && canEditTask(item, currentUser);
                  const deletable = isTask && canDeleteTask(item, currentUser);

                  const content = (
                    <div
                      className={`flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm sm:p-4 ${
                        item.is_overdue ? 'border-red-200' : 'border-slate-200'
                      }`}
                    >
                      {isTask && editable ? (
                        <button
                          type="button"
                          onClick={() => handleMarkDone(item)}
                          aria-label="Marquer comme terminée"
                          className="shrink-0 text-slate-400 hover:text-emerald-600"
                        >
                          <Circle size={20} />
                        </button>
                      ) : (
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.className}`}
                        >
                          <Icon size={16} />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${config.className}`}
                          >
                            {config.label}
                          </span>
                          {item.is_overdue && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                              <AlertTriangle size={11} />
                              En retard
                            </span>
                          )}
                        </div>
                      </div>

                      {isTask && (editable || deletable) && (
                        <div className="flex shrink-0 gap-1">
                          {editable && (
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(item.id)}
                              aria-label="Modifier la tâche"
                              className="p-1.5 text-slate-400 hover:text-primary"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {deletable && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(item)}
                              aria-label="Supprimer la tâche"
                              className="p-1.5 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );

                  if (item.type === 'capa') {
                    return (
                      <Link key={`${item.type}-${item.id}`} to={item.link}>
                        {content}
                      </Link>
                    );
                  }
                  if (item.type === 'document') {
                    return (
                      <Link key={`${item.type}-${item.id}`} to={item.link}>
                        {content}
                      </Link>
                    );
                  }
                  return <div key={`${item.type}-${item.id}`}>{content}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isNewModalOpen && (
        <TaskFormModal
          users={users}
          employees={employees}
          onClose={() => setIsNewModalOpen(false)}
          onSaved={handleTaskSaved}
        />
      )}

      {editingTask && (
        <TaskFormModal
          task={editingTask}
          users={users}
          employees={employees}
          onClose={() => setEditingTaskId(null)}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}
