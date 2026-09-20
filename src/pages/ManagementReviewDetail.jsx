import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSmartBack } from '../lib/useSmartBack.js';
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardCheck, Mail, Minus, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, TrendingDown, TrendingUp, Unlock, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useUsers } from '../lib/useUsers.js';
import { useTenant } from '../lib/useTenant.js';
import { getPdfDownload, getPdfAndSaveToDrive, getWordDownload, getXlsxDownload } from '../lib/pdfExport.js';
import { ACTION_STATUS_OPTIONS, buildPreviousActionsText } from '../lib/managementReviewActions.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { REVIEW_STATUS_LABELS } from '../lib/managementReviewStatus.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { RISK_LEVEL_LABELS, RISK_LEVEL_STYLES } from '../lib/riskStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import ReviewStatusBadge from '../components/ReviewStatusBadge.jsx';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import PageGuide from '../components/PageGuide.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import PreviousReviewBlock from '../components/managementReview/PreviousReviewBlock.jsx';
import ReviewActionCard from '../components/managementReview/ReviewActionCard.jsx';
import ReviewAiDraftModal from '../components/managementReview/ReviewAiDraftModal.jsx';
import ReviewValidateModal from '../components/managementReview/ReviewValidateModal.jsx';
import ReviewMailingModal from '../components/managementReview/ReviewMailingModal.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR');
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

const TEXT_SECTIONS = [
  { key: 'previous_actions_status', label: 'Statut des actions de la revue précédente' },
  { key: 'context_changes', label: 'Évolutions du contexte' },
  { key: 'resource_adequacy', label: 'Adéquation des ressources' },
  { key: 'improvement_opportunities', label: "Opportunités d'amélioration" },
  { key: 'conclusions', label: 'Conclusions et décisions' },
];

function SnapshotStat({ value, label }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function SnapshotBlock({ snapshot }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">État du SMQ à la clôture</h2>
      <p className="mt-1 text-xs text-slate-500">Capturé automatiquement le {formatDateTime(snapshot.generated_at)}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SnapshotStat value={snapshot.capas.open + snapshot.capas.in_progress} label="CAPA ouvertes" />
        <SnapshotStat value={snapshot.capas.overdue} label="CAPA en retard" />
        <SnapshotStat value={snapshot.audits.planned + snapshot.audits.in_progress} label="Audits en cours" />
        <SnapshotStat value={snapshot.kpis.off_target} label="KPI hors objectif" />
        <SnapshotStat value={snapshot.documents.to_review} label="Documents à réviser" />
        <SnapshotStat value={snapshot.trainings.to_renew} label="Formations à renouveler" />
      </div>
    </div>
  );
}

const AUDIT_FINDING_LABELS = {
  major_nc: 'NC majeures',
  minor_nc: 'NC mineures',
  observation: 'Observations',
  strength: 'Points forts',
};

function TrendIcon({ trend }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-emerald-600" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-600" />;
  if (trend === 'stable') return <Minus size={14} className="text-slate-400" />;
  return null;
}

// Une courbe (ou un KPI à une seule courbe) : valeur moyenne de la période dans SON unité, son objectif
// avec son propre sens (≥ plancher, ≤ plafond), la tendance et le verdict. `meets_target` est absent des
// revues créées avant qu'il existe : aucun verdict n'est alors affiché.
function KpiTrendRow({ name, item }) {
  const unit = item.unit ? ` ${item.unit}` : '';
  const hasTarget = item.target !== null && item.target !== undefined;
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="break-words">{name}</p>
        {hasTarget && (
          <p className="text-xs text-slate-500">
            Objectif {item.target_direction === 'max' ? '≤' : '≥'} {item.target}
            {unit}
          </p>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1 font-medium">
        {item.current_avg !== null && item.current_avg !== undefined ? `${item.current_avg.toFixed(1)}${unit}` : '—'}
        <TrendIcon trend={item.trend} />
        {item.meets_target === true && <CheckCircle2 size={14} className="text-emerald-600" aria-label="Objectif atteint" />}
        {item.meets_target === false && <AlertCircle size={14} className="text-red-600" aria-label="Objectif non atteint" />}
      </span>
    </li>
  );
}

// Panneau "données d'entrée" (§9.3.2) : figé à la création de la revue (ou lors d'une
// actualisation explicite tant qu'elle est en brouillon), jamais recalculé après clôture — voir
// input_snapshot dans schema.sql. Toujours rendu, avec un repli si aucune donnée n'est
// disponible (revue ancienne, ou créée sans période).
function InputCard({ title, children }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function InputDataBlock({ inputSnapshot, canRefresh, refreshing, onRefresh }) {
  if (!inputSnapshot) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 sm:p-5">
        Aucune donnée d'entrée disponible (revue créée avant cette fonctionnalité, ou sans période définie).
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Données d'entrée</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Période du {formatDate(inputSnapshot.period.start)} au {formatDate(inputSnapshot.period.end)} — calculées le{' '}
            {formatDateTime(inputSnapshot.generated_at)}
          </p>
        </div>
        {canRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Actualisation...' : "Actualiser les données d'entrée"}
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">KPI suivis</p>
          {inputSnapshot.kpi_trend.length === 0 ? (
            <p className="mt-1 text-sm text-slate-400">Aucun KPI.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {inputSnapshot.kpi_trend.map((kpi) => (
                <li key={kpi.id} className="text-sm text-slate-700">
                  {Array.isArray(kpi.series) && kpi.series.length > 0 ? (
                    <>
                      <p className="break-words font-medium">{kpi.name}</p>
                      <ul className="mt-0.5 space-y-1 border-l-2 border-slate-200 pl-2.5">
                        {kpi.series.map((item) => (
                          <KpiTrendRow key={item.label} name={item.label} item={item} />
                        ))}
                      </ul>
                    </>
                  ) : (
                    <ul>
                      <KpiTrendRow name={kpi.name} item={kpi} />
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audits réalisés</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{inputSnapshot.audits_period.count}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(inputSnapshot.audits_period.findings_by_type).map(([type, count]) => (
              <span key={type} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {AUDIT_FINDING_LABELS[type]} : {count}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Réclamations clients</p>
          <p className="mt-1 text-sm text-slate-700">
            <span className="text-lg font-semibold text-slate-900">{inputSnapshot.complaints_period.received}</span> reçue(s) —{' '}
            <span className="font-medium">{inputSnapshot.complaints_period.still_open}</span> encore ouverte(s)
          </p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CAPA</p>
          <p className="mt-1 text-sm text-slate-700">
            <span className="text-lg font-semibold text-slate-900">{inputSnapshot.capas_period.in_progress}</span> en cours ·{' '}
            <span className="font-medium">{inputSnapshot.capas_period.closed_in_period}</span> clôturée(s) sur la période
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Taux de clôture dans les délais :{' '}
            <span className="font-medium text-slate-700">
              {inputSnapshot.capas_period.on_time_closure_rate === null ? '—' : `${inputSnapshot.capas_period.on_time_closure_rate}%`}
            </span>
          </p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risques actuellement ouverts</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(inputSnapshot.risks_open).map(([level, count]) => (
              <span key={level} className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[level]}`}>
                {RISK_LEVEL_LABELS[level]} : {count}
              </span>
            ))}
          </div>
        </div>

        {/* Éléments d'entrée complémentaires (§9.3.2) : absents des revues créées avant leur ajout. */}
        {inputSnapshot.satisfaction_period && (
          <InputCard title="Satisfaction client">
            {inputSnapshot.satisfaction_period.count === 0 ? (
              <p className="mt-1 text-sm text-slate-400">Aucune enquête sur la période.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="text-lg font-semibold text-slate-900">{inputSnapshot.satisfaction_period.average_score}/5</span> · {inputSnapshot.satisfaction_period.count} enquête(s)
                </p>
                <p className="mt-1 text-xs text-slate-500">{inputSnapshot.satisfaction_period.satisfied_rate} % de clients satisfaits (note ≥ 4)</p>
              </>
            )}
          </InputCard>
        )}
        {inputSnapshot.suppliers_period && (
          <InputCard title="Performance des fournisseurs">
            <p className="mt-1 text-sm text-slate-700">
              <span className="text-lg font-semibold text-slate-900">{inputSnapshot.suppliers_period.active}</span> actif(s) ·{' '}
              {inputSnapshot.suppliers_period.evaluations} évaluation(s)
              {inputSnapshot.suppliers_period.average_score !== null && <> · note moyenne {inputSnapshot.suppliers_period.average_score}/5</>}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sous surveillance : {inputSnapshot.suppliers_period.under_watch} · À remplacer : {inputSnapshot.suppliers_period.to_replace} · Évaluations en retard :{' '}
              {inputSnapshot.suppliers_period.overdue_evaluations}
            </p>
          </InputCard>
        )}
        {inputSnapshot.nonconforming_period && (
          <InputCard title="Sorties non conformes">
            <p className="mt-1 text-sm text-slate-700">
              <span className="text-lg font-semibold text-slate-900">{inputSnapshot.nonconforming_period.detected}</span> détectée(s) —{' '}
              <span className="font-medium">{inputSnapshot.nonconforming_period.still_open}</span> encore ouverte(s)
            </p>
          </InputCard>
        )}
        {inputSnapshot.accidents_period && (
          <InputCard title="Accidents">
            <p className="mt-1 text-sm text-slate-700">
              <span className="text-lg font-semibold text-slate-900">{inputSnapshot.accidents_period.count}</span> sur la période ·{' '}
              {inputSnapshot.accidents_period.with_lost_time} avec arrêt ({inputSnapshot.accidents_period.lost_days} j perdus)
            </p>
            <p className="mt-1 text-xs text-slate-500">{inputSnapshot.accidents_period.still_open} non clôturé(s)</p>
          </InputCard>
        )}
        {inputSnapshot.competences && (
          <InputCard title="Compétences et formations">
            <p className="mt-1 text-sm text-slate-700">
              <span className="text-lg font-semibold text-slate-900">
                {inputSnapshot.competences.compliance_rate === null ? '—' : `${inputSnapshot.competences.compliance_rate} %`}
              </span>{' '}
              de formations à jour ({inputSnapshot.competences.to_renew} à renouveler, {inputSnapshot.competences.expired} échue(s))
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {inputSnapshot.competences.auditors.designated
                ? `Auditeurs internes : ${inputSnapshot.competences.auditors.qualified} qualifié(s), ${inputSnapshot.competences.auditors.to_recycle} à recycler, ${inputSnapshot.competences.auditors.not_qualified} non qualifié(s)`
                : "Auditeurs internes : aucune formation qualifiante désignée"}
            </p>
          </InputCard>
        )}
        {inputSnapshot.quality_policy && (
          <InputCard title="Politique qualité">
            {inputSnapshot.quality_policy.defined ? (
              <p className="mt-1 text-sm text-slate-700">
                Version du {formatDate(inputSnapshot.quality_policy.last_updated)} — lue par{' '}
                <span className="font-medium">
                  {inputSnapshot.quality_policy.acknowledged}/{inputSnapshot.quality_policy.users}
                </span>{' '}
                utilisateur(s)
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Aucune politique qualité publiée.</p>
            )}
          </InputCard>
        )}
      </div>
    </div>
  );
}

function EditReviewModal({ review, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: review.title,
    review_date: review.review_date,
    participants: review.participants || '',
    period_start: review.period_start || '',
    period_end: review.period_end || '',
    category_id: review.category_id || '',
    category_name: review.category?.name || '',
    previous_actions_status: review.previous_actions_status || '',
    context_changes: review.context_changes || '',
    resource_adequacy: review.resource_adequacy || '',
    improvement_opportunities: review.improvement_opportunities || '',
    conclusions: review.conclusions || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(review.is_private_to_me));
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
        categoryId = await resolvePersonalCategoryId('management_review');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    const { category_name, ...formForApi } = form;
    let response;
    try {
      response = await api.patch(`/management-reviews/${review.id}`, { ...formForApi, category_id: categoryId });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette revue.');
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
          <h2 className="text-lg font-semibold text-slate-900">Modifier la revue</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 p-2.5 text-slate-500 hover:text-slate-700">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date de revue</label>
              <input
                type="date"
                required
                value={form.review_date}
                onChange={(e) => updateField('review_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Participants</label>
              <input
                type="text"
                value={form.participants}
                onChange={(e) => updateField('participants', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Période des données d'entrée
              {review.status === 'completed' && (
                <span className="ml-1 font-normal text-slate-400">(figée, la revue est clôturée)</span>
              )}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="date"
                disabled={review.status === 'completed'}
                value={form.period_start}
                onChange={(e) => updateField('period_start', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
              />
              <input
                type="date"
                disabled={review.status === 'completed'}
                value={form.period_end}
                onChange={(e) => updateField('period_end', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>

          <CategoryVisibilityField
            baseUrl="/module-categories"
            resourceType="management_review"
            categoryName={form.category_name}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            onCategoryNameChange={(value) => updateField('category_name', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

          {TEXT_SECTIONS.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
              <AutoTextarea
                rows={2}
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          ))}

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

function CreateCapaFromActionModal({ reviewId, action, users, services, priorityDelays, onClose, onCreated }) {
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

  function handleAiSelectAction(selected) {
    updateField('corrective_action', selected.description ? `${selected.title}\n\n${selected.description}` : selected.title);
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
    // bug dans le callback du parent ne doit jamais se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post(`/management-reviews/${reviewId}/actions/${action.id}/create-capa`, payload);
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
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis cette action</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{action.description}</p>

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
            context={`Action décidée en revue de direction : ${action.description}`}
            onGenerated={handleAiGenerated}
            onSelectAction={handleAiSelectAction}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

export default function ManagementReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack('/management-reviews');
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [review, setReview] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [exportError, setExportError] = useState('');
  const [isAiDraftOpen, setIsAiDraftOpen] = useState(false);
  const [isValidateOpen, setIsValidateOpen] = useState(false);
  const [mailingKind, setMailingKind] = useState(null); // 'convocation' | 'minutes' | null
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [reopening, setReopening] = useState(false);
  const [applyingPrevious, setApplyingPrevious] = useState(false);
  const users = useUsers();
  const [services, setServices] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionForm, setActionForm] = useState({ description: '', owner: '', due_date: '', status: 'open' });
  const [actionError, setActionError] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [capaModalAction, setCapaModalAction] = useState(null);
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false);

  async function loadReview() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/management-reviews/${id}`);
      setReview(data);
    } catch {
      setError('Impossible de charger cette revue de direction.');
    } finally {
      setLoading(false);
    }
  }

  // Aperçu de la signature de validation (jamais embarquée dans le détail de la revue).
  useEffect(() => {
    if (!review?.is_validated) {
      setSignaturePreview(null);
      return;
    }
    api
      .get(`/management-reviews/${id}/validation-signature`)
      .then(({ data }) => setSignaturePreview(data?.image || null))
      .catch(() => setSignaturePreview(null));
  }, [id, review?.is_validated]);

  useEffect(() => {
    loadReview();
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    api.get('/capas/priority-delays').then(({ data }) => setPriorityDelays(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleValidated(data, signature) {
    setReview((prev) => ({ ...prev, validated_by: data.validated_by, validated_at: data.validated_at, is_validated: true, validator: { id: data.validated_by, full_name: currentUser?.full_name } }));
    setSignaturePreview(signature);
    setIsValidateOpen(false);
  }

  async function handleReopen() {
    if (!window.confirm('Rouvrir cette revue ? La validation et la signature de la direction seront effacées : il faudra la valider de nouveau.')) return;
    setReopening(true);
    setError('');
    try {
      await api.post(`/management-reviews/${id}/reopen`);
      setReview((prev) => ({ ...prev, validated_by: null, validated_at: null, is_validated: false, validator: null }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de rouvrir la revue.');
    } finally {
      setReopening(false);
    }
  }

  function handleMailingSent(mailing) {
    if (mailing) setReview((prev) => ({ ...prev, mailings: [{ ...mailing, sender: { full_name: currentUser?.full_name } }, ...(prev.mailings || [])] }));
  }

  async function handleStatusChange(event) {
    const status = event.target.value;
    try {
      const { data } = await api.patch(`/management-reviews/${id}`, { status });
      setReview((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le statut.');
    }
  }

  async function handleRefreshSnapshot() {
    setRefreshingSnapshot(true);
    setError('');
    try {
      const { data } = await api.post(`/management-reviews/${id}/refresh-snapshot`);
      setReview((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'actualiser les données d'entrée.");
    } finally {
      setRefreshingSnapshot(false);
    }
  }

  async function handleDeleteReview() {
    if (!window.confirm(`Supprimer définitivement la revue "${review.title}" et ses actions ?`)) return;
    try {
      await api.delete(`/management-reviews/${id}`);
      navigate('/management-reviews');
    } catch {
      setError('Impossible de supprimer cette revue.');
    }
  }

  async function handleAddAction(event) {
    event.preventDefault();
    setActionError('');
    setSubmittingAction(true);
    try {
      const { data } = await api.post(`/management-reviews/${id}/actions`, {
        description: actionForm.description,
        owner: actionForm.owner || undefined,
        due_date: actionForm.due_date || undefined,
        status: actionForm.status,
      });
      setReview((prev) => ({ ...prev, actions: [...prev.actions, data] }));
      setIsActionModalOpen(false);
      setActionForm({ description: '', owner: '', due_date: '', status: 'open' });
    } catch (err) {
      setActionError(err.response?.data?.error || "Impossible d'ajouter cette action.");
    } finally {
      setSubmittingAction(false);
    }
  }

  // Responsable, échéance ou statut modifiés depuis la carte : enregistré immédiatement.
  async function handlePatchAction(actionId, patch) {
    setError('');
    try {
      const { data } = await api.patch(`/management-reviews/${id}/actions/${actionId}`, patch);
      setReview((prev) => ({ ...prev, actions: prev.actions.map((a) => (a.id === actionId ? data : a)) }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la modification de l'action.");
    }
  }

  // Reporte l'état des actions de la revue précédente dans la rubrique écrite (exigée à la clôture, §9.3.2 a).
  async function handleApplyPrevious() {
    if (review.previous_actions_status && !window.confirm('Remplacer le suivi déjà saisi par l\'état actuel des actions de la revue précédente ?')) return;
    setApplyingPrevious(true);
    setError('');
    try {
      const { data } = await api.patch(`/management-reviews/${id}`, { previous_actions_status: buildPreviousActionsText(review.previous_review) });
      setReview((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de reporter le suivi des actions.');
    } finally {
      setApplyingPrevious(false);
    }
  }

  function handleAiApplied({ updated, createdActions }) {
    setReview((prev) => ({ ...prev, ...(updated || {}), actions: [...prev.actions, ...createdActions] }));
    setIsAiDraftOpen(false);
  }

  // Trois exports DÉDIÉS générés côté serveur (services/managementReviewPdf.js, ...Word.js, ...Xlsx.js) : le
  // compte rendu de la revue, pas le tableau générique de la liste.
  const exportFilename = (extension) => `revue-de-direction-${review.title.toLowerCase().replace(/\s+/g, '-')}.${extension}`;

  async function runExport(setBusy, action, failureMessage) {
    setBusy(true);
    setExportError('');
    try {
      await action();
    } catch (err) {
      setExportError(err.response?.data?.error || failureMessage);
    } finally {
      setBusy(false);
    }
  }

  const handleExportPdf = () => runExport(setExportingPdf, () => getPdfDownload(`/management-reviews/${id}/pdf`, exportFilename('pdf')), "Impossible d'exporter cette revue en PDF.");
  const handleExportXlsx = () => runExport(setExportingXlsx, () => getXlsxDownload(`/management-reviews/${id}/xlsx`, {}, exportFilename('xlsx')), 'Impossible de générer le fichier Excel.');
  const handleExportWord = () => runExport(setExportingWord, () => getWordDownload(`/management-reviews/${id}/word`, exportFilename('docx')), 'Impossible de générer le document Word.');
  const handleExportDrive = () => runExport(setExportingDrive, () => getPdfAndSaveToDrive(`/management-reviews/${id}/pdf`, 'REVDIR', review.title), "Impossible d'enregistrer sur le Drive.");

  async function handleDeleteAction(action) {
    if (!window.confirm('Supprimer cette action ?')) return;
    try {
      await api.delete(`/management-reviews/${id}/actions/${action.id}`);
      setReview((prev) => ({ ...prev, actions: prev.actions.filter((a) => a.id !== action.id) }));
    } catch {
      setError('Impossible de supprimer cette action.');
    }
  }

  function handleCapaCreated(action, capa) {
    setReview((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === action.id ? { ...a, linked_capa: capa } : a)),
    }));
    setCapaModalAction(null);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !review) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!review) return null;

  return (
    <div>
      <button
        type="button"
        onClick={goBack}
        className="-ml-1 mb-2 flex min-h-[40px] items-center gap-1 px-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="min-w-0 break-words text-lg font-semibold text-slate-900 sm:text-xl">{review.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportMenu
            onExportPdf={handleExportPdf}
            exportingPdf={exportingPdf}
            onExportXlsx={handleExportXlsx}
            exportingXlsx={exportingXlsx}
            onExportWord={handleExportWord}
            exportingWord={exportingWord}
            onExportDrive={tenant?.storage_provider === 'google_drive' ? handleExportDrive : undefined}
            exportingDrive={exportingDrive}
          />
          {canManage && !review.is_validated ? (
            <select
              value={review.status}
              onChange={handleStatusChange}
              className="min-h-[40px] rounded-md border border-slate-300 px-2 py-1 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:min-h-0"
            >
              {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <ReviewStatusBadge status={review.status} />
          )}
          {review.is_validated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <ShieldCheck size={12} />
              Validée
            </span>
          )}
          {canManage && !review.is_validated && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                aria-label="Modifier"
                className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-primary sm:p-2"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={handleDeleteReview}
                aria-label="Supprimer"
                className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-red-600 sm:p-2"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      <PageGuide id="managementReviewDetail" />
      {exportError && <p className="mt-2 text-xs text-red-600">{exportError}</p>}

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.status === 'draft' && (
            <button
              type="button"
              onClick={() => setMailingKind('convocation')}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Mail size={15} />
              Convoquer
            </button>
          )}
          {review.is_validated && (
            <button
              type="button"
              onClick={() => setMailingKind('minutes')}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Mail size={15} />
              Envoyer le compte rendu
            </button>
          )}
          {currentUser?.role === 'admin' && review.status === 'completed' && !review.is_validated && (
            <button
              type="button"
              onClick={() => setIsValidateOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <ShieldCheck size={15} />
              Valider et signer
            </button>
          )}
          {currentUser?.role === 'admin' && review.is_validated && (
            <button
              type="button"
              onClick={handleReopen}
              disabled={reopening}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Unlock size={15} />
              {reopening ? 'Réouverture...' : 'Rouvrir'}
            </button>
          )}
        </div>
      )}

      {review.is_validated && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
          <ShieldCheck size={20} className="shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-900">
              Validée et signée par {review.validator?.full_name || 'la direction'} le {formatDateTime(review.validated_at)}
            </p>
            <p className="text-xs text-emerald-800">La revue est verrouillée : seul le suivi des actions reste modifiable.</p>
          </div>
          {signaturePreview && <img src={signaturePreview} alt="Signature de la direction" className="h-12 max-w-[10rem] rounded border border-emerald-200 bg-white p-1 object-contain" />}
        </div>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Date de revue</p>
          <p className="text-sm font-medium text-slate-800">{formatDate(review.review_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Participants</p>
          <p className="text-sm font-medium text-slate-800">{review.participants || '—'}</p>
        </div>
      </div>

      <div className="mt-4">
        <InputDataBlock
          inputSnapshot={review.input_snapshot}
          canRefresh={canManage && review.status === 'draft' && Boolean(review.period_start && review.period_end)}
          refreshing={refreshingSnapshot}
          onRefresh={handleRefreshSnapshot}
        />
      </div>

      {review.snapshot && (
        <div className="mt-4">
          <SnapshotBlock snapshot={review.snapshot} />
        </div>
      )}

      {review.previous_review && (
        <div className="mt-4">
          <PreviousReviewBlock previousReview={review.previous_review} canApply={canManage && !review.is_validated} onApply={handleApplyPrevious} applying={applyingPrevious} />
        </div>
      )}

      {canManage && !review.is_validated && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/50 p-3 sm:p-4">
          <p className="min-w-0 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Brouillon IA :</span> conclusions, opportunités d'amélioration et décisions proposées d'après les données d'entrée.
          </p>
          <button
            type="button"
            onClick={() => setIsAiDraftOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
          >
            <Sparkles size={15} />
            Générer un brouillon
          </button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {TEXT_SECTIONS.map(({ key, label }) =>
          review[key] ? (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-sm text-slate-700">{review[key]}</p>
            </div>
          ) : null
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Actions décidées ({review.actions.length})</h2>
        {canManage && !review.is_validated && (
          <button
            type="button"
            onClick={() => setIsActionModalOpen(true)}
            className="flex min-h-[40px] items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Ajouter une action
          </button>
        )}
      </div>

      {review.actions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aucune action pour l'instant.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {review.actions.map((action) => (
            <ReviewActionCard
              key={action.id}
              action={action}
              users={users}
              canManage={canManage}
              locked={review.is_validated}
              onPatch={handlePatchAction}
              onDelete={handleDeleteAction}
              onCreateCapa={setCapaModalAction}
            />
          ))}
        </div>
      )}

      {canManage && (review.mailings || []).length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Envois ({review.mailings.length})</h2>
          <ul className="mt-2 space-y-2">
            {review.mailings.map((mailing) => {
              const sent = mailing.recipients.filter((recipient) => recipient.status === 'sent').length;
              return (
                <li key={mailing.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{mailing.kind === 'convocation' ? 'Convocation' : 'Compte rendu'}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(mailing.sent_at)}
                      {mailing.sender?.full_name ? ` · ${mailing.sender.full_name}` : ''}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {sent}/{mailing.recipients.length} envoyé(s) : {mailing.recipients.map((recipient) => recipient.name || recipient.email).join(', ')}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isValidateOpen && <ReviewValidateModal review={review} onClose={() => setIsValidateOpen(false)} onValidated={handleValidated} />}
      {mailingKind && <ReviewMailingModal review={review} kind={mailingKind} onClose={() => setMailingKind(null)} onSent={handleMailingSent} />}

      {isEditModalOpen && (
        <EditReviewModal
          review={review}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setReview((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nouvelle action</h2>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                aria-label="Fermer"
                className="-m-2 p-2.5 text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
            )}

            <form onSubmit={handleAddAction} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <AutoTextarea
                  rows={3}
                  required
                  value={actionForm.description}
                  onChange={(e) => setActionForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
                <select
                  value={actionForm.owner}
                  onChange={(e) => setActionForm((prev) => ({ ...prev, owner: e.target.value }))}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Échéance</label>
                  <input
                    type="date"
                    value={actionForm.due_date}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, due_date: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Statut</label>
                  <select
                    value={actionForm.status}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {ACTION_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400">Avec une échéance, l'action apparaît dans le planning de son responsable.</p>
              <button
                type="submit"
                disabled={submittingAction}
                className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {submittingAction ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAiDraftOpen && <ReviewAiDraftModal reviewId={id} review={review} onClose={() => setIsAiDraftOpen(false)} onApplied={handleAiApplied} />}

      {capaModalAction && (
        <CreateCapaFromActionModal
          reviewId={id}
          action={capaModalAction}
          users={users}
          services={services}
          priorityDelays={priorityDelays}
          onClose={() => setCapaModalAction(null)}
          onCreated={(capa) => handleCapaCreated(capaModalAction, capa)}
        />
      )}
    </div>
  );
}
