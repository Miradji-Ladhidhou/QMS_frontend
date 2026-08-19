import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { AUDIT_STATUS_LABELS, AUDIT_TYPE_LABELS } from '../lib/auditStatus.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import AuditStatusBadge from '../components/AuditStatusBadge.jsx';
import FindingTypeBadge from '../components/FindingTypeBadge.jsx';
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

function EditAuditModal({ audit, users, services, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: audit.title,
    audit_type: audit.audit_type,
    scope: audit.scope || '',
    service_id: audit.service_id || '',
    lead_auditor: audit.lead_auditor || '',
    planned_date: audit.planned_date,
    completed_date: audit.completed_date || '',
    conclusion: audit.conclusion || '',
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
      const { data } = await api.patch(`/audits/${audit.id}`, {
        title: form.title,
        audit_type: form.audit_type,
        scope: form.scope || null,
        service_id: form.service_id || null,
        lead_auditor: form.lead_auditor || null,
        planned_date: form.planned_date,
        completed_date: form.completed_date || null,
        conclusion: form.conclusion || null,
      });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de modifier l'audit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier l'audit</h2>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select
                value={form.audit_type}
                onChange={(e) => updateField('audit_type', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(AUDIT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date planifiée</label>
              <input
                type="date"
                required
                value={form.planned_date}
                onChange={(e) => updateField('planned_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Périmètre</label>
            <AutoTextarea
              rows={2}
              value={form.scope}
              onChange={(e) => updateField('scope', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Service audité</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Auditeur</label>
              <select
                value={form.lead_auditor}
                onChange={(e) => updateField('lead_auditor', e.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de clôture</label>
            <input
              type="date"
              value={form.completed_date}
              onChange={(e) => updateField('completed_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Conclusion</label>
            <AutoTextarea
              rows={3}
              value={form.conclusion}
              onChange={(e) => updateField('conclusion', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [audit, setAudit] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [findingForm, setFindingForm] = useState({ type: 'minor_nc', description: '' });
  const [findingError, setFindingError] = useState('');
  const [submittingFinding, setSubmittingFinding] = useState(false);
  const [capaModalFinding, setCapaModalFinding] = useState(null);

  async function loadAudit() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/audits/${id}`);
      setAudit(data);
    } catch {
      setError('Impossible de charger cet audit.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudit();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    api.get('/capas/priority-delays').then(({ data }) => setPriorityDelays(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/audits/${id}`, { status });
      setAudit((prev) => ({ ...prev, ...data }));
    } catch {
      setError('Impossible de mettre à jour le statut.');
    }
  }

  async function handleDeleteAudit() {
    if (!window.confirm(`Supprimer définitivement l'audit "${audit.title}" et ses constats ?`)) return;
    try {
      await api.delete(`/audits/${id}`);
      navigate('/audits');
    } catch {
      setError("Impossible de supprimer l'audit.");
    }
  }

  async function handleAddFinding(event) {
    event.preventDefault();
    setFindingError('');
    setSubmittingFinding(true);
    try {
      const { data } = await api.post(`/audits/${id}/findings`, findingForm);
      setAudit((prev) => ({ ...prev, findings: [...prev.findings, data] }));
      setIsFindingModalOpen(false);
      setFindingForm({ type: 'minor_nc', description: '' });
    } catch (err) {
      setFindingError(err.response?.data?.error || "Impossible d'ajouter ce constat.");
    } finally {
      setSubmittingFinding(false);
    }
  }

  async function handleDeleteFinding(finding) {
    if (!window.confirm('Supprimer ce constat ?')) return;
    try {
      await api.delete(`/audits/${id}/findings/${finding.id}`);
      setAudit((prev) => ({ ...prev, findings: prev.findings.filter((f) => f.id !== finding.id) }));
    } catch {
      setError('Impossible de supprimer ce constat.');
    }
  }

  function handleCapaCreated(finding, capa) {
    setAudit((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => (f.id === finding.id ? { ...f, linked_capa: capa } : f)),
    }));
    setCapaModalFinding(null);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !audit) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!audit) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/audits')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{audit.title}</h1>
        <div className="flex items-center gap-2">
          {canManage ? (
            <select
              value={audit.status}
              onChange={handleStatusChange}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.entries(AUDIT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <AuditStatusBadge status={audit.status} />
          )}
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
                onClick={handleDeleteAudit}
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
          <p className="text-xs text-slate-500">Type</p>
          <p className="text-sm font-medium text-slate-800">{AUDIT_TYPE_LABELS[audit.audit_type]}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Date planifiée</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(audit.planned_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service audité</p>
          <p className="text-sm font-medium text-slate-800">{audit.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Auditeur</p>
          <p className="text-sm font-medium text-slate-800">{audit.lead?.full_name || 'À désigner'}</p>
        </div>
        {audit.scope && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Périmètre</p>
            <p className="text-sm text-slate-700">{audit.scope}</p>
          </div>
        )}
        {audit.conclusion && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Conclusion</p>
            <p className="text-sm text-slate-700">{audit.conclusion}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Constats ({audit.findings.length})</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setIsFindingModalOpen(true)}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Ajouter un constat
          </button>
        )}
      </div>

      {audit.findings.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aucun constat pour l'instant.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {audit.findings.map((finding) => (
            <div key={finding.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <FindingTypeBadge type={finding.type} />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFinding(finding)}
                    aria-label="Supprimer le constat"
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-700">{finding.description}</p>

              {finding.linked_capa ? (
                <Link
                  to={`/capas/${finding.linked_capa.id}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <ClipboardCheck size={14} />
                  Voir la CAPA liée — {finding.linked_capa.number}
                </Link>
              ) : (
                canManage && (
                  <button
                    type="button"
                    onClick={() => setCapaModalFinding(finding)}
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
        <EditAuditModal
          audit={audit}
          users={users}
          services={services}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setAudit((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isFindingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nouveau constat</h2>
              <button
                type="button"
                onClick={() => setIsFindingModalOpen(false)}
                aria-label="Fermer"
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {findingError && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{findingError}</p>
            )}

            <form onSubmit={handleAddFinding} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type de constat</label>
                <select
                  value={findingForm.type}
                  onChange={(e) => setFindingForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="major_nc">Non-conformité majeure</option>
                  <option value="minor_nc">Non-conformité mineure</option>
                  <option value="observation">Remarque</option>
                  <option value="strength">Point fort</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <AutoTextarea
                  rows={3}
                  required
                  value={findingForm.description}
                  onChange={(e) => setFindingForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={submittingFinding}
                className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {submittingFinding ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {capaModalFinding && (
        <CreateCapaFromFindingModal
          auditId={id}
          finding={capaModalFinding}
          users={users}
          services={services}
          priorityDelays={priorityDelays}
          onClose={() => setCapaModalFinding(null)}
          onCreated={(capa) => handleCapaCreated(capaModalFinding, capa)}
        />
      )}
    </div>
  );
}

function CreateCapaFromFindingModal({ auditId, finding, users, services, priorityDelays, onClose, onCreated }) {
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
      const { data } = await api.post(`/audits/${auditId}/findings/${finding.id}/create-capa`, payload);
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
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis ce constat</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{finding.description}</p>

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
            context={`Constat d'audit : ${finding.description}`}
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
