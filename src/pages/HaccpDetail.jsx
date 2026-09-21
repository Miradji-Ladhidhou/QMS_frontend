import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSmartBack } from '../lib/useSmartBack.js';
import { AlertTriangle, ArrowLeft, ClipboardCheck, ClipboardList, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useUsers } from '../lib/useUsers.js';
import { openBlankTab } from '../lib/openInNewTab.js';
import { getWordDownload } from '../lib/pdfExport.js';
import { describeDue, formatInterval } from '../lib/haccpMonitoring.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { PLAN_STATUS_LABELS, HAZARD_TYPE_LABELS } from '../lib/haccpStatus.js';
import { RISK_LEVEL_LABELS, RISK_LEVEL_STYLES, riskLevel } from '../lib/riskStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import PlanStatusBadge from '../components/PlanStatusBadge.jsx';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';
import AiHazardSuggestion from '../components/AiHazardSuggestion.jsx';
import AiCcpSignificanceSuggestion from '../components/AiCcpSignificanceSuggestion.jsx';
import AiCcpDefinitionSuggestion from '../components/AiCcpDefinitionSuggestion.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import PageGuide from '../components/PageGuide.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import CcpLimitsFields from '../components/haccp/CcpLimitsFields.jsx';
import CcpMonitoringChart from '../components/haccp/CcpMonitoringChart.jsx';
import CcpStatusChip from '../components/haccp/CcpStatusChip.jsx';
import HaccpLinksCard from '../components/haccp/HaccpLinksCard.jsx';
import HaccpReviewCard from '../components/haccp/HaccpReviewCard.jsx';
import ReadingForm from '../components/haccp/ReadingForm.jsx';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
}

function addDaysToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function HazardScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">—</span>;
  }
  const level = riskLevel(score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[level]}`}>
      {score} · {RISK_LEVEL_LABELS[level]}
    </span>
  );
}

function ModalShell({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:rounded-xl sm:p-6 ${
          wide ? 'sm:max-w-lg' : 'sm:max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditPlanModal({ plan, services, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: plan.title,
    product_description: plan.product_description || '',
    scope: plan.scope || '',
    team: plan.team || '',
    service_id: plan.service_id || '',
    status: plan.status,
    review_date: plan.review_date || '',
    category_id: plan.category_id || '',
    category_name: plan.category?.name || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(plan.is_private_to_me));
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
        categoryId = await resolvePersonalCategoryId('haccp_plan');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const { category_name, ...formForApi } = form;
    let response;
    try {
      response = await api.patch(`/haccp/plans/${plan.id}`, { ...formForApi, category_id: categoryId });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier ce plan.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(response.data);
  }

  return (
    <ModalShell title="Modifier le plan HACCP" onClose={onClose} wide>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
          <input type="text" required value={form.title} onChange={(e) => updateField('title', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Produit concerné</label>
          <AutoTextarea rows={2} value={form.product_description} onChange={(e) => updateField('product_description', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Périmètre</label>
          <AutoTextarea rows={2} value={form.scope} onChange={(e) => updateField('scope', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Équipe HACCP</label>
          <input type="text" value={form.team} onChange={(e) => updateField('team', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Service concerné</label>
            <select value={form.service_id} onChange={(e) => updateField('service_id', e.target.value)} className={FIELD_CLASS}>
              <option value="">Aucun</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Statut</label>
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className={FIELD_CLASS}>
              {Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine revue du plan</label>
          <input type="date" value={form.review_date} onChange={(e) => updateField('review_date', e.target.value)} className={FIELD_CLASS} />
          <p className="mt-1 text-xs text-slate-400">Fixée à +12 mois à l'activation ; « Marquer revu » la met à jour.</p>
        </div>
        <CategoryVisibilityField
          baseUrl="/module-categories"
          resourceType="haccp_plan"
          categoryName={form.category_name}
          categoryId={form.category_id}
          onCategoryIdChange={(value) => updateField('category_id', value)}
          onCategoryNameChange={(value) => updateField('category_name', value)}
          isPrivate={isPrivate}
          onIsPrivateChange={setIsPrivate}
        />
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
          {submitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </ModalShell>
  );
}

function StepFormModal({ planId, step, onClose, onSaved }) {
  const [name, setName] = useState(step?.name || '');
  const [description, setDescription] = useState(step?.description || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let response;
    try {
      if (step) {
        response = await api.patch(`/haccp/steps/${step.id}`, { name, description: description || undefined });
      } else {
        response = await api.post(`/haccp/plans/${planId}/steps`, { name, description: description || undefined });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer cette étape.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved(response.data);
  }

  return (
    <ModalShell title={step ? "Modifier l'étape" : 'Nouvelle étape du procédé'} onClose={onClose}>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nom de l'étape</label>
          <input type="text" required placeholder="Ex : Pasteurisation" value={name} onChange={(e) => setName(e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <AutoTextarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={FIELD_CLASS} />
        </div>
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
          {submitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </ModalShell>
  );
}

function HazardFormModal({ stepId, hazard, laterSteps, onClose, onSaved }) {
  const [form, setForm] = useState({
    hazard_type: hazard?.hazard_type || 'biological',
    description: hazard?.description || '',
    existing_controls: hazard?.existing_controls || '',
    likelihood: String(hazard?.likelihood || 3),
    severity: String(hazard?.severity || 3),
    is_significant: hazard?.is_significant || false,
    justification: hazard?.justification || '',
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

    const payload = {
      hazard_type: form.hazard_type,
      description: form.description,
      existing_controls: form.existing_controls || undefined,
      likelihood: Number(form.likelihood),
      severity: Number(form.severity),
      is_significant: form.is_significant,
      justification: form.justification || undefined,
    };

    let response;
    try {
      response = hazard
        ? await api.patch(`/haccp/hazards/${hazard.id}`, payload)
        : await api.post(`/haccp/steps/${stepId}/hazards`, payload);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer ce danger.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved(response.data);
  }

  return (
    <ModalShell title={hazard ? 'Modifier le danger' : 'Nouveau danger'} onClose={onClose} wide>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Type de danger</label>
          <select value={form.hazard_type} onChange={(e) => updateField('hazard_type', e.target.value)} className={FIELD_CLASS}>
            {Object.entries(HAZARD_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <AutoTextarea rows={2} required value={form.description} onChange={(e) => updateField('description', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Mesures de maîtrise existantes</label>
          <AutoTextarea rows={2} value={form.existing_controls} onChange={(e) => updateField('existing_controls', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Probabilité (1-5)</label>
            <select value={form.likelihood} onChange={(e) => updateField('likelihood', e.target.value)} className={FIELD_CLASS}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gravité (1-5)</label>
            <select value={form.severity} onChange={(e) => updateField('severity', e.target.value)} className={FIELD_CLASS}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AiCcpSignificanceSuggestion
          hazardType={form.hazard_type}
          description={form.description}
          existingControls={form.existing_controls}
          likelihood={Number(form.likelihood)}
          severity={Number(form.severity)}
          laterSteps={laterSteps}
          onGenerated={(suggestion) => {
            setForm((prev) => ({
              ...prev,
              is_significant: Boolean(suggestion.is_significant),
              justification: suggestion.justification || prev.justification,
            }));
          }}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_significant}
            onChange={(e) => updateField('is_significant', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          Danger significatif (nécessite un point critique)
        </label>
        {form.is_significant && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Justification</label>
            <AutoTextarea rows={2} value={form.justification} onChange={(e) => updateField('justification', e.target.value)} className={FIELD_CLASS} />
          </div>
        )}
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
          {submitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </ModalShell>
  );
}

function CcpFormModal({ hazardId, hazard, ccp, users, onClose, onSaved }) {
  const [form, setForm] = useState({
    ccp_number: ccp?.ccp_number || '',
    critical_limits: ccp?.critical_limits || '',
    monitoring_procedure: ccp?.monitoring_procedure || '',
    monitoring_frequency: ccp?.monitoring_frequency || '',
    limit_min: ccp?.limit_min === null || ccp?.limit_min === undefined ? '' : String(ccp.limit_min),
    limit_max: ccp?.limit_max === null || ccp?.limit_max === undefined ? '' : String(ccp.limit_max),
    limit_unit: ccp?.limit_unit || '',
    monitoring_interval_hours: ccp?.monitoring_interval_hours === null || ccp?.monitoring_interval_hours === undefined ? '' : String(Number(ccp.monitoring_interval_hours)),
    monitoring_responsible: ccp?.monitoring_responsible || '',
    corrective_action_procedure: ccp?.corrective_action_procedure || '',
    verification_procedure: ccp?.verification_procedure || '',
    verification_frequency: ccp?.verification_frequency || '',
    record_keeping_procedure: ccp?.record_keeping_procedure || '',
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

    const payload = { ...form, monitoring_responsible: form.monitoring_responsible || undefined };

    let response;
    try {
      response = ccp ? await api.patch(`/haccp/ccps/${ccp.id}`, payload) : await api.post(`/haccp/hazards/${hazardId}/ccps`, payload);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer ce point critique.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSaved(response.data);
  }

  return (
    <ModalShell title={ccp ? 'Modifier le point critique (CCP)' : 'Nouveau point critique (CCP)'} onClose={onClose} wide>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {hazard && (
          <AiCcpDefinitionSuggestion
            hazardType={hazard.hazard_type}
            description={hazard.description}
            existingControls={hazard.existing_controls}
            likelihood={hazard.likelihood}
            severity={hazard.severity}
            justification={hazard.justification}
            onGenerated={(suggestion) => {
              setForm((prev) => ({
                ...prev,
                critical_limits: suggestion.critical_limits || prev.critical_limits,
                monitoring_procedure: suggestion.monitoring_procedure || prev.monitoring_procedure,
                monitoring_frequency: suggestion.monitoring_frequency || prev.monitoring_frequency,
                corrective_action_procedure: suggestion.corrective_action_procedure || prev.corrective_action_procedure,
                verification_procedure: suggestion.verification_procedure || prev.verification_procedure,
                verification_frequency: suggestion.verification_frequency || prev.verification_frequency,
                record_keeping_procedure: suggestion.record_keeping_procedure || prev.record_keeping_procedure,
              }));
            }}
          />
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Numéro du CCP</label>
          <input type="text" placeholder="Ex : CCP1" value={form.ccp_number} onChange={(e) => updateField('ccp_number', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Limites critiques</label>
          <AutoTextarea rows={2} required value={form.critical_limits} onChange={(e) => updateField('critical_limits', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Procédure de surveillance</label>
          <AutoTextarea rows={2} required value={form.monitoring_procedure} onChange={(e) => updateField('monitoring_procedure', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence de surveillance</label>
            <input type="text" placeholder="Ex : En continu" value={form.monitoring_frequency} onChange={(e) => updateField('monitoring_frequency', e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Responsable de la surveillance</label>
            <select value={form.monitoring_responsible} onChange={(e) => updateField('monitoring_responsible', e.target.value)} className={FIELD_CLASS}>
              <option value="">À désigner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <CcpLimitsFields form={form} updateField={updateField} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Actions correctives prévues</label>
          <AutoTextarea rows={2} value={form.corrective_action_procedure} onChange={(e) => updateField('corrective_action_procedure', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Procédure de vérification</label>
            <AutoTextarea rows={2} value={form.verification_procedure} onChange={(e) => updateField('verification_procedure', e.target.value)} className={FIELD_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence de vérification</label>
            <input type="text" value={form.verification_frequency} onChange={(e) => updateField('verification_frequency', e.target.value)} className={FIELD_CLASS} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Enregistrements à conserver</label>
          <AutoTextarea rows={2} value={form.record_keeping_procedure} onChange={(e) => updateField('record_keeping_procedure', e.target.value)} className={FIELD_CLASS} />
        </div>
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
          {submitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </ModalShell>
  );
}

function CreateCapaFromLogModal({ log, ccp, users, services, priorityDelays, onClose, onCreated }) {
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

    let response;
    try {
      response = await api.post(`/haccp/monitoring-logs/${log.id}/create-capa`, payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <ModalShell title="Créer une CAPA depuis cette dérive" onClose={onClose} wide>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Objet de la CAPA</label>
          <input type="text" required value={form.title} onChange={(e) => updateField('title', e.target.value)} className={FIELD_CLASS} />
        </div>

        <AiCapaSuggestion
          context={`Dérive de surveillance HACCP sur le point critique ${ccp.ccp_number || ''} (limites critiques : ${ccp.critical_limits}). Valeur relevée hors limites : ${log.recorded_value}.${log.corrective_action_taken ? ` Action corrective déjà prise sur le terrain : ${log.corrective_action_taken}.` : ''}`}
          onGenerated={handleAiGenerated}
          onSelectAction={handleAiSelectAction}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
            <select value={form.priority} onChange={(e) => handlePriorityChange(e.target.value)} className={FIELD_CLASS}>
              {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Échéance</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => {
                setDueDateTouched(true);
                updateField('due_date', e.target.value);
              }}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cause identifiée</label>
          <AutoTextarea rows={2} value={form.root_cause} onChange={(e) => updateField('root_cause', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective</label>
          <AutoTextarea rows={2} value={form.corrective_action} onChange={(e) => updateField('corrective_action', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Action préventive</label>
          <AutoTextarea rows={2} value={form.preventive_action} onChange={(e) => updateField('preventive_action', e.target.value)} className={FIELD_CLASS} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
            <select value={form.service_id} onChange={(e) => updateField('service_id', e.target.value)} className={FIELD_CLASS}>
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
            <select value={form.assigned_to} onChange={(e) => updateField('assigned_to', e.target.value)} className={FIELD_CLASS}>
              <option value="">Non assigné</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
          {submitting ? 'Création...' : 'Créer la CAPA'}
        </button>
      </form>
    </ModalShell>
  );
}

function HazardCard({ hazard, canManage, onEditHazard, onDeleteHazard, onAddCcp, onEditCcp, onDeleteCcp }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{HAZARD_TYPE_LABELS[hazard.hazard_type]}</p>
        <div className="-my-2 flex shrink-0 items-center gap-1">
          <HazardScoreBadge score={hazard.risk_score} />
          {canManage && (
            <>
              <button type="button" onClick={() => onEditHazard(hazard)} aria-label="Modifier" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-primary sm:p-1.5">
                <Pencil size={14} />
              </button>
              <button type="button" onClick={() => onDeleteHazard(hazard)} aria-label="Supprimer" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-red-600 sm:p-1.5">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="mt-0.5 break-words text-sm font-medium text-slate-800">{hazard.description}</p>
        {hazard.existing_controls && <p className="mt-1 break-words text-xs text-slate-500">Maîtrise actuelle : {hazard.existing_controls}</p>}
        {hazard.is_significant && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Danger significatif
          </p>
        )}
      </div>

      {hazard.is_significant && (
        <div className="mt-3 rounded-md border border-dashed border-slate-300 p-3">
          {hazard.ccp ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  Point critique {hazard.ccp.ccp_number ? `— ${hazard.ccp.ccp_number}` : ''}
                </p>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => onEditCcp(hazard.ccp, hazard)} aria-label="Modifier" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-primary sm:p-1.5">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => onDeleteCcp(hazard.ccp)} aria-label="Supprimer" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-red-600 sm:p-1.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Limites critiques : {hazard.ccp.critical_limits}
                {hazard.ccp.limits_text ? ` (${hazard.ccp.limits_text})` : ''}
              </p>
              <p className="text-xs text-slate-500">
                Surveillance : {hazard.ccp.monitoring_procedure}
                {hazard.ccp.monitoring_interval_hours ? ` — rappel toutes les ${formatInterval(hazard.ccp.monitoring_interval_hours)}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <CcpStatusChip ccp={hazard.ccp} />
                {hazard.ccp.last_reading && (
                  <span className="text-xs text-slate-500">
                    Dernier relevé : <span className={hazard.ccp.last_reading.within_limits ? 'text-emerald-700' : 'font-medium text-red-700'}>{hazard.ccp.last_reading.recorded_value}</span>
                  </span>
                )}
                {hazard.ccp.monitoring_state !== 'no_schedule' && <span className="text-xs text-slate-400">{describeDue(hazard.ccp)}</span>}
              </div>
            </div>
          ) : (
            canManage && (
              <button type="button" onClick={() => onAddCcp(hazard)} className="flex min-h-[40px] items-center gap-1 text-sm font-medium text-primary hover:underline sm:min-h-0">
                <Plus size={14} />
                Créer le point critique (CCP)
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function SurveillanceTab({ plan, users, services, priorityDelays, canManage, onCapaCreated, onReadingSaved }) {
  const navigate = useNavigate();
  const allCcps = plan.steps.flatMap((step) =>
    step.hazards.filter((h) => h.ccp).map((h) => ({ ...h.ccp, hazardDescription: h.description, stepName: step.name }))
  );
  const [selectedCcpId, setSelectedCcpId] = useState(allCcps[0]?.id || '');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState('');
  const [capaLog, setCapaLog] = useState(null);
  const [chartKey, setChartKey] = useState(0);
  const [creatingRisk, setCreatingRisk] = useState(false);

  const selectedCcp = allCcps.find((c) => c.id === selectedCcpId);

  async function loadLogs(ccpId) {
    if (!ccpId) return;
    setLoadingLogs(true);
    try {
      const { data } = await api.get(`/haccp/ccps/${ccpId}/monitoring-logs`);
      setLogs(data);
    } catch {
      setError('Impossible de charger les relevés de surveillance.');
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    loadLogs(selectedCcpId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCcpId]);

  function handleReadingSaved(log) {
    setLogs((prev) => [log, ...prev]);
    setChartKey((key) => key + 1);
    onReadingSaved();
  }

  // Des dérives qui reviennent : plus une affaire d'action immédiate mais de cause — on ouvre un risque (brouillon à
  // coter) que la personne complète, la CAPA se crée depuis le relevé hors limites concerné.
  async function handleCreateRisk() {
    setCreatingRisk(true);
    setError('');
    const label = selectedCcp.ccp_number ? `CCP ${selectedCcp.ccp_number}` : 'un point critique';
    try {
      const { data } = await api.post('/risks', {
        title: `Dérives répétées — ${label} (${plan.title})`,
        description: `${selectedCcp.recent_deviations} relevés hors limites en 7 jours sur ${label} (« ${selectedCcp.hazardDescription} », étape « ${selectedCcp.stepName} »). Limites critiques : ${selectedCcp.critical_limits}. Cause à identifier et maîtrise à renforcer.`,
        category: 'Sécurité alimentaire',
        service_id: plan.service_id || undefined,
        likelihood: 4,
        impact: 4,
      });
      navigate(`/risks/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le risque.');
      setCreatingRisk(false);
    }
  }

  if (allCcps.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
        Aucun point critique défini pour l'instant — créez-en un depuis l'onglet Analyse.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select value={selectedCcpId} onChange={(e) => setSelectedCcpId(e.target.value)} aria-label="Point critique" className={`${FIELD_CLASS} sm:flex-1`}>
          {allCcps.map((ccp) => (
            <option key={ccp.id} value={ccp.id}>
              {ccp.ccp_number ? `${ccp.ccp_number} — ` : ''}
              {ccp.hazardDescription} ({ccp.stepName})
            </option>
          ))}
        </select>
        <Link to="/haccp/today" className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <ClipboardList size={15} />
          Relevés du jour
        </Link>
      </div>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {selectedCcp && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CcpStatusChip ccp={selectedCcp} />
            {selectedCcp.monitoring_state !== 'no_schedule' && <span className="text-xs text-slate-500">{describeDue(selectedCcp)}</span>}
            {selectedCcp.monitoring_state === 'no_schedule' && <span className="text-xs text-slate-400">Aucun rappel : renseignez un intervalle dans le CCP.</span>}
          </div>

          {selectedCcp.repeated_deviation && canManage && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  <strong>{selectedCcp.recent_deviations} relevés hors limites en 7 jours.</strong> Traitez la cause : créez une CAPA depuis le dernier relevé hors limites ci-dessous, ou ouvrez un risque.
                </span>
              </p>
              <button type="button" onClick={handleCreateRisk} disabled={creatingRisk} className="mt-2 min-h-[40px] rounded-md border border-red-300 bg-white px-3 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-60">
                {creatingRisk ? 'Création...' : 'Ouvrir un risque'}
              </button>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Nouveau relevé</p>
            <p className="mb-3 text-xs text-slate-500">Limites critiques : {selectedCcp.limits_text || selectedCcp.critical_limits}</p>
            <ReadingForm key={selectedCcp.id} ccp={{ ...selectedCcp, limits: selectedCcp.limit_min !== null || selectedCcp.limit_max !== null ? { min: selectedCcp.limit_min === null ? null : Number(selectedCcp.limit_min), max: selectedCcp.limit_max === null ? null : Number(selectedCcp.limit_max), unit: selectedCcp.limit_unit || '' } : null }} onSaved={handleReadingSaved} />
          </div>

          <CcpMonitoringChart ccp={selectedCcp} refreshKey={chartKey} showAlert={!canManage} />
        </>
      )}

      <div className="mt-4 space-y-2">
        {loadingLogs ? (
          <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : logs.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">Aucun relevé pour ce point critique.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`rounded-lg border p-3 ${log.within_limits ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-slate-900">
                    {log.recorded_value}{' '}
                    <span className={log.within_limits ? 'text-emerald-700' : 'text-red-700'}>
                      {log.within_limits ? '· Conforme' : '· Hors limites'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(log.recorded_at)}
                    {log.recorded_by_user ? ` · ${log.recorded_by_user.full_name}` : ''}
                  </p>
                  {log.corrective_action_taken && <p className="mt-1 break-words text-xs text-slate-600">Action corrective : {log.corrective_action_taken}</p>}
                </div>
                {!log.within_limits && (
                  <div>
                    {log.linked_capa ? (
                      <Link to={`/capas/${log.linked_capa.id}`} className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 sm:min-h-0">
                        <ClipboardCheck size={14} />
                        CAPA {log.linked_capa.number}
                      </Link>
                    ) : (
                      canManage && (
                        <button
                          type="button"
                          onClick={() => setCapaLog(log)}
                          className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-primary px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 sm:min-h-0"
                        >
                          <ClipboardCheck size={14} />
                          Créer une CAPA
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {capaLog && selectedCcp && (
        <CreateCapaFromLogModal
          log={capaLog}
          ccp={selectedCcp}
          users={users}
          services={services}
          priorityDelays={priorityDelays}
          onClose={() => setCapaLog(null)}
          onCreated={(capa) => {
            setLogs((prev) => prev.map((l) => (l.id === capaLog.id ? { ...l, linked_capa: capa } : l)));
            setCapaLog(null);
            onCapaCreated();
          }}
        />
      )}
    </div>
  );
}

export default function HaccpDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack('/haccp');
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [plan, setPlan] = useState(null);
  const [services, setServices] = useState([]);
  const users = useUsers();
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [linksKey, setLinksKey] = useState(0);
  const [stepModal, setStepModal] = useState(null); // { step } | { new: true } | null
  const [hazardModal, setHazardModal] = useState(null); // { stepId, hazard?, laterSteps }
  const [ccpModal, setCcpModal] = useState(null); // { hazardId, hazard, ccp? }

  async function loadPlan() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/haccp/plans/${id}`);
      setPlan(data);
    } catch {
      setError('Impossible de charger ce plan HACCP.');
    } finally {
      setLoading(false);
    }
  }

  // Recharge le plan sans écran de chargement (après un relevé, une CAPA…) : les états de surveillance des CCP
  // restent ainsi à jour sans faire clignoter la page.
  async function refreshPlan() {
    try {
      const { data } = await api.get(`/haccp/plans/${id}`);
      setPlan(data);
    } catch {
      /* le plan déjà affiché reste valable */
    }
  }

  useEffect(() => {
    loadPlan();
    api.get('/services').then(({ data }) => setServices(data.filter((service) => service.is_active))).catch(() => {});
    api.get('/capas/priority-delays').then(({ data }) => setPriorityDelays(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/haccp/plans/${id}`, { status });
      setPlan((prev) => ({ ...prev, ...data }));
      refreshPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le statut.');
    }
  }

  async function handleExportPdf() {
    const tab = openBlankTab();
    setError('');
    setExportingPdf(true);
    try {
      const response = await api.get(`/haccp/plans/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      if (tab) tab.location.href = url;
    } catch {
      tab?.close();
      setError("Impossible d'exporter ce plan en PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportWord() {
    setError('');
    setExportingWord(true);
    try {
      await getWordDownload(`/haccp/plans/${id}/word`, `haccp-${plan.title.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, '-').slice(0, 50)}.docx`);
    } catch {
      setError("Impossible d'exporter ce plan en Word.");
    } finally {
      setExportingWord(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement "${plan.title}" et tout son contenu (étapes, dangers, CCP, surveillance) ?`)) return;
    try {
      await api.delete(`/haccp/plans/${id}`);
      navigate('/haccp');
    } catch {
      setError('Impossible de supprimer ce plan.');
    }
  }

  async function handleDeleteStep(step) {
    if (!window.confirm(`Supprimer l'étape "${step.name}" et tous ses dangers/CCP ?`)) return;
    try {
      await api.delete(`/haccp/steps/${step.id}`);
      loadPlan();
    } catch {
      setError('Impossible de supprimer cette étape.');
    }
  }

  async function handleDeleteHazard(hazard) {
    if (!window.confirm('Supprimer ce danger et son éventuel point critique ?')) return;
    try {
      await api.delete(`/haccp/hazards/${hazard.id}`);
      loadPlan();
    } catch {
      setError('Impossible de supprimer ce danger.');
    }
  }

  async function handleDeleteCcp(ccp) {
    if (!window.confirm('Supprimer ce point critique et ses relevés de surveillance ?')) return;
    try {
      await api.delete(`/haccp/ccps/${ccp.id}`);
      loadPlan();
    } catch {
      setError('Impossible de supprimer ce point critique.');
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }
  if (error && !plan) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }
  if (!plan) return null;

  return (
    <div>
      <button type="button" onClick={goBack} className="-ml-1 mb-2 flex min-h-[40px] items-center gap-1 px-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="min-w-0 break-words text-lg font-semibold text-slate-900 sm:text-xl">{plan.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <select value={plan.status} onChange={handleStatusChange} className="min-h-[40px] rounded-md border border-slate-300 px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:min-h-0 sm:text-sm">
              {Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <PlanStatusBadge status={plan.status} />
          )}
          <ExportMenu onExportPdf={handleExportPdf} exportingPdf={exportingPdf} onExportWord={handleExportWord} exportingWord={exportingWord} />
          {canManage && (
            <>
              <button type="button" onClick={() => setIsEditModalOpen(true)} aria-label="Modifier" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-primary sm:p-2">
                <Pencil size={16} />
              </button>
              <button type="button" onClick={handleDelete} aria-label="Supprimer" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-red-600 sm:p-2">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      <PageGuide id="haccpDetail" />

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Produit concerné</p>
          <p className="text-sm font-medium text-slate-800">{plan.product_description || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{plan.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Équipe HACCP</p>
          <p className="text-sm font-medium text-slate-800">{plan.team || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Périmètre</p>
          <p className="text-sm font-medium text-slate-800">{plan.scope || '—'}</p>
        </div>
      </div>

      <HaccpReviewCard plan={plan} canManage={canManage} onPlanChanged={(updated) => setPlan((prev) => ({ ...prev, ...updated }))} />
      <HaccpLinksCard planId={plan.id} canManage={canManage} refreshKey={linksKey} />

      <div className="mt-5 flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('analysis')}
          className={`min-h-[44px] border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'analysis' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Analyse des dangers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('surveillance')}
          className={`min-h-[44px] border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'surveillance' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Surveillance
        </button>
      </div>

      {activeTab === 'analysis' ? (
        <div className="mt-4 space-y-4">
          {plan.steps.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
              Aucune étape définie pour l'instant.
            </p>
          )}
          {plan.steps.map((step) => (
            <div key={step.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-400">Étape {step.step_number}</p>
                  <h2 className="text-sm font-semibold text-slate-900">{step.name}</h2>
                  {step.description && <p className="mt-0.5 text-sm text-slate-600">{step.description}</p>}
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setStepModal({ step })} aria-label="Modifier l'étape" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-primary sm:p-1.5">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => handleDeleteStep(step)} aria-label="Supprimer l'étape" className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-red-600 sm:p-1.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {canManage && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setHazardModal({ stepId: step.id, laterSteps: plan.steps.filter((s) => s.step_number > step.step_number) })
                    }
                    className="flex min-h-[40px] items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:px-2.5"
                  >
                    <Plus size={14} />
                    Ajouter un danger
                  </button>
                </div>
              )}

              {canManage && (
                <div className="mt-3">
                  <AiHazardSuggestion stepId={step.id} onAdded={loadPlan} />
                </div>
              )}

              {step.hazards.length > 0 && (
                <div className="mt-3 space-y-2">
                  {step.hazards.map((hazard) => (
                    <HazardCard
                      key={hazard.id}
                      hazard={hazard}
                      canManage={canManage}
                      onEditHazard={(h) =>
                        setHazardModal({
                          stepId: step.id,
                          hazard: h,
                          laterSteps: plan.steps.filter((s) => s.step_number > step.step_number),
                        })
                      }
                      onDeleteHazard={handleDeleteHazard}
                      onAddCcp={(h) => setCcpModal({ hazardId: h.id, hazard: h })}
                      onEditCcp={(ccp) => setCcpModal({ hazardId: hazard.id, ccp, hazard })}
                      onDeleteCcp={handleDeleteCcp}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {canManage && (
            <button
              type="button"
              onClick={() => setStepModal({ new: true })}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 text-sm font-medium text-slate-500 hover:border-primary hover:text-primary"
            >
              <Plus size={16} />
              Ajouter une étape du procédé
            </button>
          )}
        </div>
      ) : (
        <SurveillanceTab
          plan={plan}
          users={users}
          services={services}
          priorityDelays={priorityDelays}
          canManage={canManage}
          onCapaCreated={refreshPlan}
          onReadingSaved={refreshPlan}
        />
      )}

      {isEditModalOpen && (
        <EditPlanModal
          plan={plan}
          services={services}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setPlan((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {stepModal && (
        <StepFormModal
          planId={plan.id}
          step={stepModal.step}
          onClose={() => setStepModal(null)}
          onSaved={() => {
            setStepModal(null);
            loadPlan();
          }}
        />
      )}

      {hazardModal && (
        <HazardFormModal
          stepId={hazardModal.stepId}
          hazard={hazardModal.hazard}
          laterSteps={hazardModal.laterSteps}
          onClose={() => setHazardModal(null)}
          onSaved={() => {
            setHazardModal(null);
            loadPlan();
          }}
        />
      )}

      {ccpModal && (
        <CcpFormModal
          hazardId={ccpModal.hazardId}
          hazard={ccpModal.hazard}
          ccp={ccpModal.ccp}
          users={users}
          onClose={() => setCcpModal(null)}
          onSaved={() => {
            setCcpModal(null);
            loadPlan();
          }}
        />
      )}
    </div>
  );
}
