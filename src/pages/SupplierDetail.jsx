import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { SUPPLIER_STATUS_LABELS, EVALUATION_DECISION_LABELS } from '../lib/supplierStatus.js';
import SupplierStatusBadge from '../components/SupplierStatusBadge.jsx';
import EvaluationDecisionBadge from '../components/EvaluationDecisionBadge.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';

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

// Délai de traitement (en jours) paramétré pour la gravité choisie (Paramètres > CAPA).
function getDelayDays(priority, priorityDelays) {
  return priorityDelays?.[priority] ?? null;
}

const SCORE_FIELDS = [
  { key: 'quality_score', label: 'Qualité' },
  { key: 'delivery_score', label: 'Délais' },
  { key: 'price_score', label: 'Prix' },
  { key: 'responsiveness_score', label: 'Réactivité' },
];

function EditSupplierModal({ supplier, services, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: supplier.name,
    category: supplier.category || '',
    contact_name: supplier.contact_name || '',
    contact_email: supplier.contact_email || '',
    contact_phone: supplier.contact_phone || '',
    criticality: supplier.criticality,
    status: supplier.status,
    service_id: supplier.service_id || '',
    next_evaluation_date: supplier.next_evaluation_date || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.patch(`/suppliers/${supplier.id}`, form);
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier ce fournisseur.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier le fournisseur</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => updateField('contact_name', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Criticité</label>
              <select
                value={form.criticality}
                onChange={(e) => updateField('criticality', e.target.value)}
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Statut</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(SUPPLIER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine évaluation</label>
              <input
                type="date"
                value={form.next_evaluation_date}
                onChange={(e) => updateField('next_evaluation_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

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

function CreateCapaFromEvaluationModal({ supplierId, supplierName, evaluation, users, services, priorityDelays, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    service_id: '',
    priority: 'medium',
    severity: 'medium',
    assigned_to: '',
    due_date: priorityDelays ? addDaysToToday(priorityDelays.medium) : '',
    root_cause: '',
    corrective_action: '',
    preventive_action: '',
  });
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // La gravité pilote le délai de traitement paramétré (Paramètres > CAPA) : l'échéance se
  // met à jour tant que l'utilisateur ne l'a pas modifiée à la main.
  function handlePriorityChange(priority) {
    setForm((prev) => ({
      ...prev,
      priority,
      severity: priority,
      due_date: !dueDateTouched && priorityDelays ? addDaysToToday(priorityDelays[priority]) : prev.due_date,
    }));
  }

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

    try {
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
      const { data } = await api.post(`/suppliers/${supplierId}/evaluations/${evaluation.id}/create-capa`, payload);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cette évaluation</h2>
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
            context={`Évaluation fournisseur ${supplierName} — décision : ${EVALUATION_DECISION_LABELS[evaluation.decision]}. Notes : qualité ${evaluation.quality_score}/5, délais ${evaluation.delivery_score}/5, prix ${evaluation.price_score}/5, réactivité ${evaluation.responsiveness_score}/5.${evaluation.comment ? ` Commentaire : ${evaluation.comment}` : ''}`}
            onGenerated={handleAiGenerated}
            onSelectAction={handleAiSelectAction}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
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

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [supplier, setSupplier] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState({
    evaluation_date: new Date().toISOString().slice(0, 10),
    quality_score: '3',
    delivery_score: '3',
    price_score: '3',
    responsiveness_score: '3',
    decision: 'maintained',
    comment: '',
  });
  const [evaluationError, setEvaluationError] = useState('');
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);
  const [capaModalEvaluation, setCapaModalEvaluation] = useState(null);

  async function loadSupplier() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/suppliers/${id}`);
      setSupplier(data);
    } catch {
      setError('Impossible de charger ce fournisseur.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupplier();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    api.get('/capas/priority-delays').then(({ data }) => setPriorityDelays(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement "${supplier.name}" et ses évaluations ?`)) return;
    try {
      await api.delete(`/suppliers/${id}`);
      navigate('/suppliers');
    } catch {
      setError('Impossible de supprimer ce fournisseur.');
    }
  }

  async function handleAddEvaluation(event) {
    event.preventDefault();
    setEvaluationError('');
    setSubmittingEvaluation(true);
    try {
      const { data } = await api.post(`/suppliers/${id}/evaluations`, {
        ...evaluationForm,
        quality_score: Number(evaluationForm.quality_score),
        delivery_score: Number(evaluationForm.delivery_score),
        price_score: Number(evaluationForm.price_score),
        responsiveness_score: Number(evaluationForm.responsiveness_score),
      });
      setSupplier((prev) => ({ ...prev, evaluations: [data, ...prev.evaluations] }));
      setIsEvaluationModalOpen(false);
    } catch (err) {
      setEvaluationError(err.response?.data?.error || "Impossible d'ajouter cette évaluation.");
    } finally {
      setSubmittingEvaluation(false);
    }
  }

  async function handleDeleteEvaluation(evaluation) {
    if (!window.confirm('Supprimer cette évaluation ?')) return;
    try {
      await api.delete(`/suppliers/${id}/evaluations/${evaluation.id}`);
      setSupplier((prev) => ({ ...prev, evaluations: prev.evaluations.filter((e) => e.id !== evaluation.id) }));
    } catch {
      setError('Impossible de supprimer cette évaluation.');
    }
  }

  function handleCapaCreated(evaluation, capa) {
    setSupplier((prev) => ({
      ...prev,
      evaluations: prev.evaluations.map((e) => (e.id === evaluation.id ? { ...e, linked_capa: capa } : e)),
    }));
    setCapaModalEvaluation(null);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !supplier) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!supplier) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/suppliers')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{supplier.name}</h1>
        <div className="flex items-center gap-2">
          <CapaPriorityBadge priority={supplier.criticality} />
          <SupplierStatusBadge status={supplier.status} />
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                aria-label="Modifier"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Supprimer"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Catégorie</p>
          <p className="text-sm font-medium text-slate-800">{supplier.category || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Contact</p>
          <p className="text-sm font-medium text-slate-800">{supplier.contact_name || '—'}</p>
          {supplier.contact_email && <p className="text-xs text-slate-500">{supplier.contact_email}</p>}
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{supplier.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Prochaine évaluation</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(supplier.next_evaluation_date)}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Évaluations ({supplier.evaluations.length})</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setIsEvaluationModalOpen(true)}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Ajouter une évaluation
          </button>
        )}
      </div>

      {supplier.evaluations.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aucune évaluation pour l'instant.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {supplier.evaluations.map((evaluation) => (
            <div key={evaluation.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatDate(evaluation.evaluation_date)}</p>
                  <p className="text-xs text-slate-500">{evaluation.evaluator?.full_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Note globale : {evaluation.overall_score}/5
                  </span>
                  <EvaluationDecisionBadge decision={evaluation.decision} />
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvaluation(evaluation)}
                      aria-label="Supprimer l'évaluation"
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2">
                {SCORE_FIELDS.map(({ key, label }) => (
                  <div key={key} className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
                    <p className="text-sm font-semibold text-slate-800">{evaluation[key]}/5</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {evaluation.comment && <p className="mt-2 text-sm text-slate-700">{evaluation.comment}</p>}

              {evaluation.linked_capa ? (
                <Link
                  to={`/capas/${evaluation.linked_capa.id}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <ClipboardCheck size={14} />
                  Voir la CAPA liée — {evaluation.linked_capa.number}
                </Link>
              ) : (
                canManage && (
                  <button
                    type="button"
                    onClick={() => setCapaModalEvaluation(evaluation)}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                  >
                    <ClipboardCheck size={14} />
                    Créer une CAPA
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {isEditModalOpen && (
        <EditSupplierModal
          supplier={supplier}
          services={services}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setSupplier((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isEvaluationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nouvelle évaluation</h2>
              <button
                type="button"
                onClick={() => setIsEvaluationModalOpen(false)}
                aria-label="Fermer"
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {evaluationError && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{evaluationError}</p>
            )}

            <form onSubmit={handleAddEvaluation} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Date d'évaluation</label>
                <input
                  type="date"
                  required
                  value={evaluationForm.evaluation_date}
                  onChange={(e) => setEvaluationForm((prev) => ({ ...prev, evaluation_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SCORE_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                    <select
                      value={evaluationForm[key]}
                      onChange={(e) => setEvaluationForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Décision</label>
                <select
                  value={evaluationForm.decision}
                  onChange={(e) => setEvaluationForm((prev) => ({ ...prev, decision: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {Object.entries(EVALUATION_DECISION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Commentaire</label>
                <AutoTextarea
                  rows={2}
                  value={evaluationForm.comment}
                  onChange={(e) => setEvaluationForm((prev) => ({ ...prev, comment: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submittingEvaluation}
                className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {submittingEvaluation ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {capaModalEvaluation && (
        <CreateCapaFromEvaluationModal
          supplierId={id}
          supplierName={supplier.name}
          evaluation={capaModalEvaluation}
          users={users}
          services={services}
          priorityDelays={priorityDelays}
          onClose={() => setCapaModalEvaluation(null)}
          onCreated={(capa) => handleCapaCreated(capaModalEvaluation, capa)}
        />
      )}
    </div>
  );
}
