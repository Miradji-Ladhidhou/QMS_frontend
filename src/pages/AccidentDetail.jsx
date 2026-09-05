import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { ACCIDENT_STATUS_LABELS, ACCIDENT_SEVERITY_LABELS } from '../lib/accidentStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import AccidentStatusBadge from '../components/AccidentStatusBadge.jsx';
import AccidentSeverityBadge from '../components/AccidentSeverityBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Ajoute `days` jours à la date du jour, au format yyyy-mm-dd attendu par <input type="date">.
function addDaysToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDelayDays(priority, priorityDelays) {
  return priorityDelays?.[priority] ?? null;
}

// Correspondance gravité accident -> priorité/gravité CAPA : un accident mortel ou grave doit
// se traduire par une CAPA critique/majeure, jamais laissée à une priorité par défaut neutre.
const SEVERITY_TO_CAPA_PRIORITY = { fatal: 'critical', severe: 'high', moderate: 'medium', minor: 'low' };

const PERSON_KIND_LABEL = { user: 'Compte', employee: 'Sans compte' };

function personKey(kind, id) {
  return `${kind}:${id}`;
}

function combinePeople(users, employees) {
  return [
    ...users.map((user) => ({ id: user.id, full_name: user.full_name, kind: 'user' })),
    ...employees.map((employee) => ({ id: employee.id, full_name: employee.full_name, kind: 'employee' })),
  ].sort((a, b) => a.full_name.localeCompare(b.full_name, 'fr'));
}

function initialPersonKey(accident) {
  if (accident.injured_user_id) return personKey('user', accident.injured_user_id);
  if (accident.injured_employee_id) return personKey('employee', accident.injured_employee_id);
  return '';
}

function injuredPersonName(accident) {
  return accident.injured_user?.full_name || accident.injured_employee?.full_name || null;
}

function EditAccidentModal({ accident, users, employees, services, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: accident.title,
    occurred_at: accident.occurred_at,
    location: accident.location || '',
    person: initialPersonKey(accident),
    service_id: accident.service_id || '',
    description: accident.description || '',
    immediate_cause: accident.immediate_cause || '',
    immediate_actions: accident.immediate_actions || '',
    root_cause: accident.root_cause || '',
    severity: accident.severity,
    with_lost_time: accident.with_lost_time,
    lost_days: accident.lost_days ? String(accident.lost_days) : '',
    category_id: accident.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(accident.is_private_to_me));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('accident');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const [personKind, personId] = form.person ? form.person.split(':') : [];

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.patch(`/accidents/${accident.id}`, {
        title: form.title,
        occurred_at: form.occurred_at,
        location: form.location || null,
        injured_user_id: personKind === 'user' ? personId : null,
        injured_employee_id: personKind === 'employee' ? personId : null,
        service_id: form.service_id || null,
        description: form.description || null,
        immediate_cause: form.immediate_cause || null,
        immediate_actions: form.immediate_actions || null,
        root_cause: form.root_cause || null,
        severity: form.severity,
        with_lost_time: form.with_lost_time,
        lost_days: form.with_lost_time && form.lost_days ? Number(form.lost_days) : null,
        category_id: categoryId,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cet accident.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier l'accident</h2>
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
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date de l'accident</label>
              <input
                type="date"
                required
                value={form.occurred_at}
                onChange={(e) => updateField('occurred_at', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Personne concernée</label>
            <select
              value={form.person}
              onChange={(e) => updateField('person', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Non renseignée</option>
              {combinePeople(users, employees).map((person) => (
                <option key={personKey(person.kind, person.id)} value={personKey(person.kind, person.id)}>
                  {person.full_name} ({PERSON_KIND_LABEL[person.kind]})
                </option>
              ))}
            </select>
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Description des circonstances</label>
            <AutoTextarea
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cause immédiate</label>
            <AutoTextarea
              rows={2}
              value={form.immediate_cause}
              onChange={(e) => updateField('immediate_cause', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Actions immédiates prises</label>
            <AutoTextarea
              rows={2}
              value={form.immediate_actions}
              onChange={(e) => updateField('immediate_actions', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cause profonde (investigation)</label>
            <AutoTextarea
              rows={2}
              value={form.root_cause}
              onChange={(e) => updateField('root_cause', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
            <select
              value={form.severity}
              onChange={(e) => updateField('severity', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(ACCIDENT_SEVERITY_LABELS).map(([value, label]) => (
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
                checked={form.with_lost_time}
                onChange={(e) => updateField('with_lost_time', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Avec arrêt de travail
            </label>
            {form.with_lost_time && (
              <input
                type="number"
                min="0"
                placeholder="Nombre de jours d'arrêt"
                value={form.lost_days}
                onChange={(e) => updateField('lost_days', e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            )}
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
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateAccidentCapaModal({ accidentId, accident, users, services, priorityDelays, onClose, onCreated }) {
  const initialPriority = SEVERITY_TO_CAPA_PRIORITY[accident.severity] || 'medium';
  const [form, setForm] = useState({
    title: `Accident du travail — ${accident.title}`,
    service_id: accident.service_id || '',
    priority: initialPriority,
    severity: initialPriority,
    assigned_to: '',
    due_date: priorityDelays ? addDaysToToday(priorityDelays[initialPriority]) : '',
    root_cause: accident.root_cause || '',
    corrective_action: '',
    preventive_action: '',
  });
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // La priorité pilote le délai de traitement paramétré (Paramètres > CAPA) : l'échéance se
  // met à jour tant que l'utilisateur ne l'a pas modifiée à la main — même logique que
  // RiskDetail.jsx (handlePriorityChange).
  function handlePriorityChange(priority) {
    setForm((prev) => ({
      ...prev,
      priority,
      severity: priority,
      due_date: !dueDateTouched && priorityDelays ? addDaysToToday(priorityDelays[priority]) : prev.due_date,
    }));
  }

  // Même pattern que RiskDetail.jsx (handleAiGenerated/handleAiSelectAction) : ne remplace
  // root_cause que si l'IA en propose (sinon on garde accident.root_cause déjà prérempli
  // ci-dessus), corrective_action n'est jamais touché par onGenerated — uniquement par le choix
  // d'une action suggérée.
  function handleAiGenerated(suggestion) {
    if (suggestion.overall_priority) handlePriorityChange(suggestion.overall_priority);
    setForm((prev) => ({
      ...prev,
      root_cause: suggestion.root_causes?.length ? suggestion.root_causes.map((c) => `- ${c}`).join('\n') : prev.root_cause,
      preventive_action: suggestion.preventive_actions?.length
        ? suggestion.preventive_actions.map((a) => `- ${a}`).join('\n')
        : prev.preventive_action,
    }));
  }

  function handleAiSelectAction(action) {
    updateField('corrective_action', action.description ? `${action.title}\n\n${action.description}` : action.title);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      title: form.title,
      service_id: form.service_id || undefined,
      priority: form.priority,
      severity: form.severity,
      assigned_to: form.assigned_to || undefined,
      due_date: form.due_date || undefined,
      root_cause: form.root_cause || undefined,
      corrective_action: form.corrective_action || undefined,
      preventive_action: form.preventive_action || undefined,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post(`/accidents/${accidentId}/create-capa`, payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
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
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cet accident</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet de la CAPA</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <AiCapaSuggestion
            context={`Accident du travail : ${accident.title}${accident.description ? `. ${accident.description}` : ''}${accident.immediate_cause ? ` Cause immédiate : ${accident.immediate_cause}` : ''}`}
            onGenerated={handleAiGenerated}
            onSelectAction={handleAiSelectAction}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité / priorité</label>
              <select
                value={form.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Échéance
                {!dueDateTouched && (
                  <span className="ml-1 font-normal text-slate-400">
                    (délai suggéré : {getDelayDays(form.priority, priorityDelays) ?? '—'} jours)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => {
                  setDueDateTouched(true);
                  updateField('due_date', e.target.value);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cause identifiée</label>
            <AutoTextarea
              rows={2}
              value={form.root_cause}
              onChange={(e) => updateField('root_cause', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective</label>
            <AutoTextarea
              rows={2}
              value={form.corrective_action}
              onChange={(e) => updateField('corrective_action', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action préventive</label>
            <AutoTextarea
              rows={2}
              value={form.preventive_action}
              onChange={(e) => updateField('preventive_action', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Assigné à</label>
              <select
                value={form.assigned_to}
                onChange={(e) => updateField('assigned_to', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Non assigné</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer la CAPA'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [accident, setAccident] = useState(null);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);

  // Admin uniquement, sinon le créateur (voir DELETE /accidents/:id côté backend) — un manager
  // qui n'a pas déclaré cet accident peut l'investiguer/le clôturer mais pas le supprimer.
  const canDelete = accident && currentUser && (currentUser.role === 'admin' || accident.created_by === currentUser.id);

  async function loadAccident() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/accidents/${id}`);
      setAccident(data);
    } catch {
      setError('Impossible de charger cet accident.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccident();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api
      .get('/employees')
      .then(({ data }) => setEmployees(data.filter((employee) => employee.is_active)))
      .catch(() => {});
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    api.get('/capas/priority-delays').then(({ data }) => setPriorityDelays(data)).catch(() => {});
    api
      .get('/module-categories', { params: { resource_type: 'accident' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/accidents/${id}`, { status });
      setAccident((prev) => ({ ...prev, ...data }));
    } catch {
      setError('Impossible de mettre à jour le statut.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement "${accident.title}" ?`)) return;
    try {
      await api.delete(`/accidents/${id}`);
      navigate('/accidents');
    } catch {
      setError('Impossible de supprimer cet accident.');
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !accident) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!accident) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/accidents')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{accident.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <AccidentSeverityBadge severity={accident.severity} />
          {canManage ? (
            <select
              value={accident.status}
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(ACCIDENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <AccidentStatusBadge status={accident.status} />
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              aria-label="Modifier"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
            >
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Supprimer"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Date de l'accident</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(accident.occurred_at)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Lieu</p>
          <p className="text-sm font-medium text-slate-800">{accident.location || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Personne concernée</p>
          <p className="text-sm font-medium text-slate-800">{injuredPersonName(accident) || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{accident.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Arrêt de travail</p>
          <p className="text-sm font-medium text-slate-800">
            {accident.with_lost_time ? `Oui — ${accident.lost_days ?? '—'} jour(s)` : 'Non'}
          </p>
        </div>
        {accident.description && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Description des circonstances</p>
            <p className="text-sm text-slate-700">{accident.description}</p>
          </div>
        )}
      </div>

      {(accident.immediate_cause || accident.immediate_actions || accident.root_cause) && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5">
          {accident.immediate_cause && (
            <div>
              <p className="text-xs text-slate-500">Cause immédiate</p>
              <p className="text-sm text-slate-700">{accident.immediate_cause}</p>
            </div>
          )}
          {accident.immediate_actions && (
            <div>
              <p className="text-xs text-slate-500">Actions immédiates</p>
              <p className="text-sm text-slate-700">{accident.immediate_actions}</p>
            </div>
          )}
          {accident.root_cause && (
            <div>
              <p className="text-xs text-slate-500">Cause profonde (investigation)</p>
              <p className="text-sm text-slate-700">{accident.root_cause}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {accident.linked_capa ? (
          <Link
            to={`/capas/${accident.linked_capa.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <ClipboardCheck size={18} />
            Voir la CAPA liée — {accident.linked_capa.number}
          </Link>
        ) : (
          canManage && (
            <button
              type="button"
              onClick={() => setIsCapaModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <ClipboardCheck size={18} />
              Créer une CAPA
            </button>
          )
        )}
      </div>

      {isEditModalOpen && (
        <EditAccidentModal
          accident={accident}
          users={users}
          employees={employees}
          services={services}
          categories={categories}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setAccident((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isCapaModalOpen && (
        <CreateAccidentCapaModal
          accidentId={id}
          accident={accident}
          users={users}
          services={services}
          priorityDelays={priorityDelays}
          onClose={() => setIsCapaModalOpen(false)}
          onCreated={(capa) => {
            setAccident((prev) => ({ ...prev, linked_capa: capa }));
            setIsCapaModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
