import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  Download,
  Filter,
  FileCheck,
  FileText,
  Folder,
  GraduationCap,
  List,
  Loader2,
  MessageSquareWarning,
  Pencil,
  Plus,
  Repeat,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx, exportToDrive } from '../lib/pdfExport.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';

const TYPE_CONFIG = {
  capa: { label: 'CAPA', icon: ClipboardList, className: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  document: { label: 'Document', icon: FileText, className: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  procedure: { label: 'Procédure', icon: FileCheck, className: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  training: { label: 'Formation', icon: GraduationCap, className: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  task: { label: 'Tâche', icon: CheckSquare, className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  audit: { label: 'Audit', icon: ClipboardCheck, className: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  complaint: { label: 'Réclamation', icon: MessageSquareWarning, className: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  risk: { label: 'Risque', icon: ShieldAlert, className: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  supplier: { label: 'Fournisseur', icon: Truck, className: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const PRIORITY_CONFIG = {
  low: { label: 'Basse', border: 'border-l-slate-300', dot: 'bg-slate-400' },
  normal: { label: 'Normale', border: 'border-l-sky-400', dot: 'bg-sky-500' },
  high: { label: 'Haute', border: 'border-l-amber-400', dot: 'bg-amber-500' },
  urgent: { label: 'Urgente', border: 'border-l-red-500', dot: 'bg-red-600' },
};

const RECURRENCE_LABELS = {
  none: 'Aucune',
  daily: 'Quotidienne',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuelle',
  yearly: 'Annuelle',
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

function TaskFormModal({ task, users, employees, categories, onClose, onSaved }) {
  const isEditing = Boolean(task);
  const initialSource = task?.assigned_to ? 'user' : task?.assigned_employee_id ? 'employee' : 'none';

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.due_date || new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState(initialSource);
  const [personId, setPersonId] = useState(task?.assigned_to || task?.assigned_employee_id || '');
  const [categoryId, setCategoryId] = useState(task?.category_id || '');
  const [isPrivate, setIsPrivate] = useState(Boolean(task?.is_private_to_me));
  const [priority, setPriority] = useState(task?.priority || 'normal');
  const [checklist, setChecklist] = useState(task?.checklist || []);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [recurrence, setRecurrence] = useState(task?.recurrence || 'none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(task?.recurrence_interval || 1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSourceChange(next) {
    setSource(next);
    setPersonId('');
  }

  function handleAddChecklistItem() {
    const text = checklistDraft.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { text, done: false }]);
    setChecklistDraft('');
  }

  function handleToggleChecklistItem(index) {
    setChecklist((prev) => prev.map((entry, i) => (i === index ? { ...entry, done: !entry.done } : entry)));
  }

  function handleRemoveChecklistItem(index) {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
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

    let finalCategoryId = categoryId || undefined;
    if (isPrivate) {
      try {
        finalCategoryId = await resolvePersonalCategoryId('task');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onSaved() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = isEditing
        ? await api.patch(`/tasks/${task.id}`, {
            title,
            description: description || null,
            due_date: dueDate,
            category_id: finalCategoryId || null,
            priority,
            checklist,
            recurrence,
            recurrence_interval: recurrenceInterval,
            ...assignment,
          })
        : await api.post('/tasks', {
            title,
            description: description || undefined,
            due_date: dueDate,
            category_id: finalCategoryId,
            priority,
            checklist,
            recurrence,
            recurrence_interval: recurrenceInterval,
            ...assignment,
          });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer cette tâche.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved(response.data);
  }

  const options = source === 'user' ? users : source === 'employee' ? employees : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
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
            <AutoTextarea
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
                    priority === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                  {config.label}
                </button>
              ))}
            </div>
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

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              Checklist
              {checklist.length > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                  {checklist.filter((entry) => entry.done).length}/{checklist.length}
                </span>
              )}
            </label>
            <p className="mb-2 text-xs text-slate-400">
              Décomposez cette tâche en étapes que vous pourrez cocher une par une, directement depuis la liste — sans rouvrir ce
              formulaire.
            </p>
            {checklist.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {checklist.map((entry, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistItem(index)}
                      aria-label={entry.done ? 'Marquer comme à faire' : 'Marquer comme fait'}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        entry.done ? 'border-primary bg-primary text-white' : 'border-slate-300'
                      }`}
                    >
                      {entry.done && <Check size={12} />}
                    </button>
                    <span className={`flex-1 text-sm ${entry.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {entry.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(index)}
                      aria-label="Supprimer cette ligne"
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={checklistDraft}
                onChange={(e) => setChecklistDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Ajouter une étape..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Ajouter
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Récurrence</label>
            <div className="flex gap-2">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
              >
                {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {recurrence !== 'none' && (
                <input
                  type="number"
                  min="1"
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                  aria-label="Intervalle de récurrence"
                  className="w-20 shrink-0 rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                />
              )}
            </div>
            {recurrence !== 'none' && (
              <p className="mt-1 text-xs text-slate-500">
                À la clôture, une nouvelle tâche est recréée automatiquement à l'échéance suivante.
              </p>
            )}
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
            {submitting ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer la tâche'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Construite à partir de getFullYear/getMonth/getDate (jamais toISOString, qui convertit en
// UTC et peut décaler la date d'un jour selon le fuseau du navigateur) — même précaution que
// nextDueDate côté backend.
function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Aperçu chiffré calculé sur `items` (le périmètre chargé, scope service compris) plutôt que
// sur `filteredItems` : un total qui bougerait avec les filtres de recherche/type juste
// en-dessous serait déroutant (deux nombres qui se répondent l'un l'autre plutôt qu'un vrai
// point de repère stable). Donne un vrai aperçu d'ensemble avant de plonger dans le détail —
// la page ne se résumait jusqu'ici qu'à une longue liste filtrable, sans vision globale.
function PlanningSummary({ items }) {
  const today = formatIsoDate(new Date());
  const weekEnd = formatIsoDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000));

  const overdue = items.filter((item) => item.is_overdue).length;
  const dueToday = items.filter((item) => item.date === today).length;
  const dueThisWeek = items.filter((item) => item.date >= today && item.date <= weekEnd).length;

  const stats = [
    { label: 'En retard', value: overdue, tone: overdue > 0 ? 'text-red-600' : 'text-slate-900' },
    { label: "Aujourd'hui", value: dueToday, tone: 'text-slate-900' },
    { label: 'Cette semaine', value: dueThisWeek, tone: 'text-slate-900' },
    { label: 'Total', value: items.length, tone: 'text-slate-900' },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
          <p className={`text-2xl font-semibold tabular-nums ${stat.tone}`}>{stat.value}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function getMonthCells(year, month) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// La checklist n'était visible que comme un badge "2/5" figé sur la carte : la seule façon de
// cocher une étape était d'ouvrir "Modifier" (formulaire complet) puis d'enregistrer — pour un
// geste aussi fréquent que cocher une étape, c'est ce qui la rendait "incompréhensible" (aucune
// interaction directe visible depuis la liste). Le badge devient un bouton qui déplie le détail
// de la checklist directement sur la carte, chaque étape cochable en un clic (PATCH
// /tasks/:id { checklist } uniquement, pas besoin d'ouvrir le formulaire).
function PlanningItemCard({ item, currentUser, canManage, selected, onToggleSelect, onMarkDone, onToggleChecklistItem, onEdit, onDelete }) {
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;
  const isTask = item.type === 'task';
  const editable = isTask && canEditTask(item, currentUser);
  const deletable = isTask && canDeleteTask(item, currentUser);
  const [checklistExpanded, setChecklistExpanded] = useState(false);

  const priorityBorder = isTask ? PRIORITY_CONFIG[item.priority]?.border : null;
  const checklist = isTask ? item.checklist || [] : [];
  const checklistDone = checklist.filter((entry) => entry.done).length;
  const checklistTotal = checklist.length;

  const content = (
    <div
      className={`rounded-xl border bg-white shadow-sm ${item.is_overdue ? 'border-red-200' : 'border-slate-200'} ${
        priorityBorder ? `border-l-4 ${priorityBorder}` : ''
      }`}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
      {isTask && canManage && (
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggleSelect}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
        />
      )}

      {isTask && editable ? (
        <button
          type="button"
          onClick={() => onMarkDone(item)}
          aria-label="Marquer comme terminée"
          className="shrink-0 text-slate-400 hover:text-emerald-600"
        >
          <Circle size={20} />
        </button>
      ) : (
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
          <Icon size={16} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${config.className}`}>
            {config.label}
          </span>
          {item.is_overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
              <AlertTriangle size={11} />
              En retard
            </span>
          )}
          {isTask && item.recurrence && item.recurrence !== 'none' && (
            <span className="inline-flex items-center text-slate-400" title={`Récurrence : ${RECURRENCE_LABELS[item.recurrence]}`}>
              <Repeat size={12} />
            </span>
          )}
          {isTask && checklistTotal > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setChecklistExpanded((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              <CheckSquare size={11} />
              {checklistDone}/{checklistTotal}
              {checklistExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
        </div>
      </div>

      {isTask && (editable || deletable) && (
        <div className="flex shrink-0 gap-1">
          {editable && (
            <button
              type="button"
              onClick={() => onEdit(item.id)}
              aria-label="Modifier la tâche"
              className="p-1.5 text-slate-400 hover:text-primary"
            >
              <Pencil size={16} />
            </button>
          )}
          {deletable && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              aria-label="Supprimer la tâche"
              className="p-1.5 text-slate-400 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
      </div>

      {isTask && checklistExpanded && checklistTotal > 0 && (
        <ul className="space-y-1.5 border-t border-slate-100 px-3 pb-3 pt-2.5 sm:px-4">
          {checklist.map((entry, index) => (
            <li key={index} className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (editable) onToggleChecklistItem(item, index);
                }}
                disabled={!editable}
                aria-label={entry.done ? 'Marquer comme à faire' : 'Marquer comme fait'}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  entry.done ? 'border-primary bg-primary text-white' : 'border-slate-300'
                } ${editable ? '' : 'cursor-default opacity-70'}`}
              >
                {entry.done && <Check size={10} />}
              </button>
              <span className={`text-sm ${entry.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (item.type === 'capa' || item.type === 'document' || item.type === 'procedure') {
    return <Link to={item.link}>{content}</Link>;
  }
  return <div>{content}</div>;
}

// Légende des couleurs affichées sur le calendrier — seulement les types réellement présents
// ce mois-ci (jamais les 9 d'un coup, la plupart n'auraient aucune puce visible), sinon une
// puce colorée reste indéchiffrable sans deviner ou cliquer sur chaque jour.
function CalendarLegend({ types }) {
  if (types.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3">
      {types.map((type) => (
        <span key={type} className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${TYPE_CONFIG[type].dot}`} />
          {TYPE_CONFIG[type].label}
        </span>
      ))}
    </div>
  );
}

function CalendarView({ year, month, grouped, onPrevMonth, onNextMonth, onToday, onJumpToDate, selectedDate, onSelectDate }) {
  const cells = getMonthCells(year, month);
  const today = formatIsoDate(new Date());
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthTypesPresent = [
    ...new Set(
      cells
        .filter(Boolean)
        .flatMap((date) => grouped[formatIsoDate(date)] || [])
        .map((item) => item.type)
    ),
  ];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Mois précédent"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold capitalize text-slate-900">{monthLabel}</p>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Mois suivant"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Aujourd'hui
        </button>
        <div className="relative">
          <CalendarDays size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onJumpToDate(e.target.value)}
            aria-label="Aller à une date"
            className="rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const iso = formatIsoDate(date);
          const dayItems = grouped[iso] || [];
          const visibleTypes = [...new Set(dayItems.map((item) => item.type))];
          const hasOverdue = dayItems.some((item) => item.is_overdue);
          const isSelected = selectedDate === iso;
          const isToday = iso === today;

          // Infobulle native (survol) listant les titres du jour — sans elle, une puce ou un
          // badge ne dit rien de CE qu'il y a ce jour-là avant de cliquer dessus.
          const tooltip = dayItems.map((item) => `${TYPE_CONFIG[item.type].label} — ${item.title}`).join('\n');

          return (
            <button
              type="button"
              key={iso}
              onClick={() => onSelectDate(iso)}
              title={tooltip || undefined}
              className={`flex min-h-14 flex-col items-center gap-1 rounded-lg border p-1.5 text-left text-xs transition-colors sm:min-h-28 sm:items-stretch ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : isToday
                    ? 'border-slate-300 bg-slate-50'
                    : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center self-center rounded-full font-medium sm:self-start ${
                  isToday ? 'bg-primary text-white' : 'text-slate-700'
                }`}
              >
                {date.getDate()}
              </span>

              {/* Mobile : colonnes trop étroites (7 par ligne) pour du texte lisible — on
                  garde les puces compactes, décodées par CalendarLegend ci-dessous. */}
              {dayItems.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-0.5 sm:hidden">
                  {dayItems.length <= 3 ? (
                    visibleTypes.slice(0, 3).map((type) => (
                      <span key={type} className={`h-1.5 w-1.5 rounded-full ${TYPE_CONFIG[type].dot}`} />
                    ))
                  ) : (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                        hasOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {dayItems.length}
                    </span>
                  )}
                </div>
              )}

              {/* À partir de sm (colonnes plus larges) : le vrai titre de chaque élément,
                  tronqué, plutôt qu'une puce à décoder. */}
              {dayItems.length > 0 && (
                <div className="hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex">
                  {dayItems.slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${TYPE_CONFIG[item.type].className}`}
                    >
                      {item.title}
                    </span>
                  ))}
                  {dayItems.length > 2 && (
                    <span className="px-1 text-[10px] font-medium text-slate-400">+{dayItems.length - 2} autre(s)</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <CalendarLegend types={monthTypesPresent} />
    </div>
  );
}

export default function Planning() {
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const role = currentUser?.role;
  const canFilterByService = role === 'admin' || role === 'manager';
  const canManage = isManagerRole(role);
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [taskCategories, setTaskCategories] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState([]);
  const [overdueOnly, setOverdueOnly] = useState(() => searchParams.get('overdue') === '1');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState('calendar');
  const [groupBy, setGroupBy] = useState('type');
  const [collapsedTypeFolders, setCollapsedTypeFolders] = useState(() => new Set());
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => formatIsoDate(new Date()));

  function toggleTypeFilter(type) {
    setTypeFilter((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function toggleTypeFolder(type) {
    setCollapsedTypeFolders((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter.length > 0 && !typeFilter.includes(item.type)) return false;
      if (overdueOnly && !item.is_overdue) return false;
      // Ne s'applique qu'aux tâches (seul type portant assigned_to dans l'agrégat) — les autres
      // types d'éléments restent visibles, ce filtre ne les concerne pas (bug corrigé : il les
      // masquait tous dès que ce filtre était actif).
      if (assigneeFilter && item.type === 'task' && item.assigned_to !== assigneeFilter) return false;
      if (searchText.trim() && !item.title.toLowerCase().includes(searchText.trim().toLowerCase())) return false;
      return true;
    });
  }, [items, typeFilter, overdueOnly, assigneeFilter, searchText]);

  function toggleSelectTask(id) {
    setSelectedTaskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedTaskIds([]);
    loadPlanning(selectedServiceIds);
  }

  async function handleBulkDeleteTasks() {
    if (
      !window.confirm(`Supprimer définitivement ${selectedTaskIds.length} tâche(s) sélectionnée(s) ? Cette action est irréversible.`)
    ) {
      return;
    }
    try {
      await api.delete('/tasks/bulk', { data: { ids: selectedTaskIds } });
      setSelectedTaskIds([]);
      await loadPlanning(selectedServiceIds);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces tâches.');
    }
  }

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
        const [usersRes, employeesRes, categoriesRes] = await Promise.all([
          api.get('/users'),
          api.get('/employees'),
          api.get('/module-categories', { params: { resource_type: 'task' } }),
        ]);
        if (!cancelled) {
          setUsers(usersRes.data);
          setEmployees(employeesRes.data.filter((employee) => employee.is_active));
          setTaskCategories(categoriesRes.data);
        }
      } catch {
        // Non bloquant : le formulaire de tâche fonctionne sans assigné/catégorie si ces listes échouent.
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

  // Coche/décoche une seule étape directement depuis la carte (voir PlanningItemCard) — un
  // simple PATCH ne portant que sur checklist, jamais besoin d'ouvrir le formulaire complet
  // pour ce geste fréquent.
  async function handleToggleChecklistItem(item, index) {
    const updatedChecklist = (item.checklist || []).map((entry, i) => (i === index ? { ...entry, done: !entry.done } : entry));
    try {
      await api.patch(`/tasks/${item.id}`, { checklist: updatedChecklist });
      await loadPlanning(selectedServiceIds);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour la checklist.');
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

  const grouped = filteredItems.reduce((acc, item) => {
    (acc[item.date] ||= []).push(item);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();

  // Regroupement "par type" (voir groupBy) : tout mélangé sous une seule date rendait la liste
  // difficile à parcourir dès qu'il y avait plusieurs sortes d'éléments le même jour — un dossier
  // par module (même ordre que les puces de filtre ci-dessus), chacun trié par échéance.
  const groupedByType = Object.keys(TYPE_CONFIG)
    .map((type) => ({ type, items: filteredItems.filter((item) => item.type === type).sort((a, b) => (a.date > b.date ? 1 : -1)) }))
    .filter((group) => group.items.length > 0);

  // Décrit les filtres réellement actifs pour le sous-titre de l'export — un auditeur qui reçoit
  // ce document doit savoir sur quel périmètre il porte sans avoir à redemander.
  function describeActiveFilters() {
    const parts = [];
    if (selectedServiceIds.length > 0) {
      const names = allServices.filter((s) => selectedServiceIds.includes(s.id)).map((s) => s.name);
      if (names.length > 0) parts.push(`Services : ${names.join(', ')}`);
    }
    if (typeFilter.length > 0) parts.push(`Types : ${typeFilter.map((t) => TYPE_CONFIG[t].label).join(', ')}`);
    if (overdueOnly) parts.push('En retard uniquement');
    if (assigneeFilter) {
      const user = users.find((u) => u.id === assigneeFilter);
      parts.push(`Assigné : ${user?.full_name || assigneeFilter}`);
    }
    if (searchText.trim()) parts.push(`Recherche : "${searchText.trim()}"`);
    return parts;
  }

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? filteredItems.filter((item) => scopeIds.includes(item.id)) : filteredItems;
    const headers = ['Date', 'Type', 'Titre', 'En retard'];
    const rows = source.map((item) => [item.date, TYPE_CONFIG[item.type].label, item.title, item.is_overdue ? 'Oui' : 'Non']);
    const countLabel = `${source.length} élément${source.length > 1 ? 's' : ''}`;
    exportToCsv(`planning-${new Date().toISOString().slice(0, 10)}.csv`, 'Planning', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: [countLabel, ...describeActiveFilters()].join(' · '),
    });
  }

  // Partagé par l'export PDF et l'export Excel — mêmes colonnes/lignes, seul le format de
  // sortie change (voir exportToPdf/exportToXlsx, pdfExport.js).
  function buildTablePayload(scopeIds) {
    const source = scopeIds ? filteredItems.filter((item) => scopeIds.includes(item.id)) : filteredItems;
    const columns = [
      { key: 'date', label: 'Date', width: 0.15 },
      { key: 'type', label: 'Type', width: 0.2 },
      { key: 'title', label: 'Titre', width: 0.5 },
      { key: 'overdue', label: 'En retard', width: 0.15 },
    ];
    const rows = source.map((item) => ({
      date: item.date,
      type: TYPE_CONFIG[item.type].label,
      title: item.title,
      overdue: item.is_overdue ? 'Oui' : 'Non',
    }));
    const countLabel = `${source.length} élément${source.length > 1 ? 's' : ''}`;
    return { columns, rows, subtitle: [countLabel, ...describeActiveFilters()].join(' · ') };
  }

  async function handleExportPdf(scopeIds) {
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const { columns, rows, subtitle } = buildTablePayload(scopeIds);
      await exportToPdf(`planning-${new Date().toISOString().slice(0, 10)}.pdf`, 'Planning', columns, rows, {
        subtitle,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const { columns, rows, subtitle } = buildTablePayload(scopeIds);
      await exportToXlsx(`planning-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Planning', columns, rows, {
        subtitle,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le fichier Excel.');
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const { columns, rows, subtitle } = buildTablePayload(scopeIds);
      await exportToDrive('PLANNING', 'Planning', columns, rows, { subtitle, generatedBy: currentUser?.full_name });
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
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Planning</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={filteredItems.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || filteredItems.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => handleExportXlsx()}
            disabled={exportingXlsx || filteredItems.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingXlsx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter Excel
          </button>
          {tenant?.storage_provider === 'google_drive' && (
            <button
              type="button"
              onClick={() => handleExportDrive()}
              disabled={exportingDrive || filteredItems.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              {exportingDrive ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
              Enregistrer sur Drive
            </button>
          )}
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
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}

      {!loading && <PlanningSummary items={items} />}

      {/* Un seul panneau de filtres (recherche, service, type, retard, assigné) plutôt que deux
          cartes empilées répétant chacune un en-tête "Filtre" — sous-sections labellisées pour
          garder la même information sans la redondance visuelle. */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter size={16} />
          Filtres
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Rechercher un titre..."
            className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {canFilterByService && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Service</p>
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

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Type</p>
          <div className="flex flex-wrap gap-2">
            <label
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                overdueOnly ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input type="checkbox" checked={overdueOnly} onChange={() => setOverdueOnly((prev) => !prev)} className="sr-only" />
              {overdueOnly && <Check size={14} />}
              En retard uniquement
            </label>

            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              const checked = typeFilter.includes(type);
              return (
                <label
                  key={type}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    checked ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleTypeFilter(type)} className="sr-only" />
                  {checked && <Check size={14} />}
                  {config.label}
                </label>
              );
            })}
          </div>
        </div>

        {users.length > 0 && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Assigné (tâches)</label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="">Tous</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filteredItems.length} élément{filteredItems.length > 1 ? 's' : ''}
          {filteredItems.length !== items.length && ` sur ${items.length}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              viewMode === 'list' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={16} />
            Liste
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              viewMode === 'calendar' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={16} />
            Calendrier
          </button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          Grouper :
          <button
            type="button"
            onClick={() => setGroupBy('date')}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              groupBy === 'date' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Par date
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('type')}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              groupBy === 'type' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Folder size={12} />
            Par dossier
          </button>
        </div>
      )}

      {canManage && (
        <SelectAllToggle
          ids={filteredItems.filter((item) => item.type === 'task').map((item) => item.id)}
          selectedIds={selectedTaskIds}
          onChange={setSelectedTaskIds}
        />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedTaskIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedTaskIds)}
          onExportPdf={() => handleExportPdf(selectedTaskIds)}
          exportingPdf={exportingPdf}
          onExportXlsx={() => handleExportXlsx(selectedTaskIds)}
          exportingXlsx={exportingXlsx}
          onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive(selectedTaskIds) : undefined}
          exportingDrive={exportingDrive}
          onDelete={handleBulkDeleteTasks}
          onClear={() => setSelectedTaskIds([])}
        />
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <>
          <CalendarView
            year={calendarDate.getFullYear()}
            month={calendarDate.getMonth()}
            grouped={grouped}
            onPrevMonth={() => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            onNextMonth={() => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            onToday={() => {
              const now = new Date();
              setCalendarDate(now);
              setSelectedCalendarDate(formatIsoDate(now));
            }}
            onJumpToDate={(dateStr) => {
              if (!dateStr) return;
              const [y, m, d] = dateStr.split('-').map(Number);
              setCalendarDate(new Date(y, m - 1, d));
              setSelectedCalendarDate(dateStr);
            }}
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
          />
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-500">{formatDateHeading(selectedCalendarDate)}</h2>
            {(grouped[selectedCalendarDate] || []).length === 0 ? (
              <p className="text-sm text-slate-500">Rien ce jour-là.</p>
            ) : (
              <div className="space-y-2">
                {grouped[selectedCalendarDate].map((item) => (
                  <PlanningItemCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    currentUser={currentUser}
                    canManage={canManage}
                    selected={selectedTaskIds.includes(item.id)}
                    onToggleSelect={() => toggleSelectTask(item.id)}
                    onMarkDone={handleMarkDone}
                    onToggleChecklistItem={handleToggleChecklistItem}
                    onEdit={setEditingTaskId}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : filteredItems.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Rien à venir pour l'instant.</p>
      ) : groupBy === 'type' ? (
        <div className="mt-6 space-y-3">
          {groupedByType.map(({ type, items: typeItems }) => {
            const config = TYPE_CONFIG[type];
            const FolderIcon = config.icon;
            const collapsed = collapsedTypeFolders.has(type);
            return (
              <div key={type} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleTypeFolder(type)}
                  className="flex w-full items-center justify-between gap-3 p-3 sm:p-4"
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.className}`}>
                      <FolderIcon size={16} />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{config.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {typeItems.length}
                    </span>
                  </span>
                  {collapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                </button>
                {!collapsed && (
                  <div className="space-y-2 border-t border-slate-100 p-3 sm:p-4">
                    {typeItems.map((item) => (
                      <PlanningItemCard
                        key={`${item.type}-${item.id}`}
                        item={item}
                        currentUser={currentUser}
                        canManage={canManage}
                        selected={selectedTaskIds.includes(item.id)}
                        onToggleSelect={() => toggleSelectTask(item.id)}
                        onMarkDone={handleMarkDone}
                        onToggleChecklistItem={handleToggleChecklistItem}
                        onEdit={setEditingTaskId}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <h2 className="mb-2 text-sm font-semibold text-slate-500">{formatDateHeading(date)}</h2>
              <div className="space-y-2">
                {grouped[date].map((item) => (
                  <PlanningItemCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    currentUser={currentUser}
                    canManage={canManage}
                    selected={selectedTaskIds.includes(item.id)}
                    onToggleSelect={() => toggleSelectTask(item.id)}
                    onMarkDone={handleMarkDone}
                    onToggleChecklistItem={handleToggleChecklistItem}
                    onEdit={setEditingTaskId}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isNewModalOpen && (
        <TaskFormModal
          users={users}
          employees={employees}
          categories={taskCategories}
          onClose={() => setIsNewModalOpen(false)}
          onSaved={handleTaskSaved}
        />
      )}

      {editingTask && (
        <TaskFormModal
          task={editingTask}
          users={users}
          employees={employees}
          categories={taskCategories}
          onClose={() => setEditingTaskId(null)}
          onSaved={handleTaskSaved}
        />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="task"
          endpoint="/tasks/bulk-category"
          categories={taskCategories}
          selectedIds={selectedTaskIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}
    </div>
  );
}
