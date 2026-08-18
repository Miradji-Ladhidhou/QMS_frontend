import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ClipboardCheck, ClipboardPlus, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import QqoqccpStatusBadge from '../components/QqoqccpStatusBadge.jsx';

// Mêmes noms de champs que qqoqccp_analyses (schema.sql) et que le corps attendu par
// PATCH /api/qqoqccp/:id — voir backend/src/routes/qqoqccp.js.
const QUESTIONS = [
  { key: 'qui', label: 'Qui ?', placeholder: 'Qui est concerné ? Qui a détecté le problème ?' },
  { key: 'quoi', label: 'Quoi ?', placeholder: "Que s'est-il passé exactement ?" },
  { key: 'ou_', label: 'Où ?', placeholder: 'Où le problème a-t-il eu lieu ?' },
  { key: 'quand_', label: 'Quand ?', placeholder: 'Quand le problème est-il survenu ? À quelle fréquence ?' },
  { key: 'comment_', label: 'Comment ?', placeholder: "Comment le problème s'est-il produit ?" },
  { key: 'combien', label: 'Combien ?', placeholder: "Quel est l'impact, le coût, la quantité concernée ?" },
  { key: 'pourquoi', label: 'Pourquoi ?', placeholder: 'Pourquoi pense-t-on que cela s\'est produit ?' },
];
const MIN_FIELDS_FOR_GENERATE = 3;
const SAVE_DEBOUNCE_MS = 1000;

function buildForm(analysis) {
  const form = {};
  for (const { key } of QUESTIONS) {
    form[key] = analysis[key] || '';
  }
  return form;
}

// Mêmes helpers que Capas.jsx (NewCapaModal) pour l'échéance suggérée selon la priorité —
// voir Paramètres > CAPA pour les délais configurés par tenant (GET /capas/priority-delays).
function addDaysToToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDelayDays(priority, priorityDelays) {
  return priorityDelays?.[priority] ?? null;
}

function AiSuggestedBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
      <Sparkles size={10} />
      Suggéré par l'IA
    </span>
  );
}

// Formulaire d'ajustement révélé par "Passer à l'ouverture de la CAPA" (flow=capa) — reprend
// la synthèse/les causes/actions IA comme point de départ modifiable, jamais figé.
function CapaAdjustmentForm({
  form,
  users,
  priorityDelays,
  priorityTouched,
  severityTouched,
  dueDateTouched,
  suggestedActions,
  selectedActionIndex,
  onFieldChange,
  onPriorityChange,
  onSeverityChange,
  onDueDateChange,
  onSelectAction,
  onSelectCustomAction,
  onSubmit,
  submitting,
  error,
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <ClipboardPlus size={18} className="text-primary" />
        Ouvrir la CAPA
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Les valeurs ci-dessous sont pré-remplies à partir de l'analyse — ajustez-les avant de créer la CAPA.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
          <input
            type="text"
            placeholder="Production, Qualité, Logistique..."
            value={form.service}
            onChange={(e) => onFieldChange('service', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex flex-wrap items-center text-sm font-medium text-slate-700">
              Priorité
              {!priorityTouched && form.priority && <AiSuggestedBadge />}
            </label>
            <select
              value={form.priority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 flex flex-wrap items-center text-sm font-medium text-slate-700">
              Gravité
              {!severityTouched && form.severity && <AiSuggestedBadge />}
            </label>
            <select
              value={form.severity}
              onChange={(e) => onSeverityChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(CAPA_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cause racine</label>
          <textarea
            rows={3}
            value={form.root_cause}
            onChange={(e) => onFieldChange('root_cause', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective</label>

          {suggestedActions.length > 0 && (
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectAction(i)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    selectedActionIndex === i
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-medium text-slate-900">{action.title}</p>
                  {action.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{action.description}</p>}
                </button>
              ))}
              <button
                type="button"
                onClick={onSelectCustomAction}
                className={`rounded-lg border border-dashed p-3 text-left text-sm transition-colors ${
                  selectedActionIndex === 'custom'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Écrire ma propre action
              </button>
            </div>
          )}

          <textarea
            rows={3}
            placeholder="Que va-t-on faire pour corriger le problème ?"
            value={form.corrective_action}
            onChange={(e) => onFieldChange('corrective_action', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Action préventive</label>
          <textarea
            rows={2}
            placeholder="Comment éviter que cela se reproduise ?"
            value={form.preventive_action}
            onChange={(e) => onFieldChange('preventive_action', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Responsable assigné</label>
          <select
            value={form.assigned_to}
            onChange={(e) => onFieldChange('assigned_to', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Non assigné</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Échéance
            {!dueDateTouched && (
              <span className="ml-1 font-normal text-slate-400">
                (suggéré : {getDelayDays(form.priority, priorityDelays) ?? '—'} jours)
              </span>
            )}
          </label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => onDueDateChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Création...
            </>
          ) : (
            'Ouvrir la CAPA'
          )}
        </button>
      </form>
    </div>
  );
}

export default function QqoqccpDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  // Par champ : undefined (rien à signaler) | 'saving' | 'saved' | 'error'
  const [fieldStatus, setFieldStatus] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const timers = useRef({});
  const savedTimers = useRef({});

  // Formulaire d'ajustement avant l'ouverture de la CAPA — disponible pour toute analyse,
  // pas seulement celles démarrées depuis "Diagnostic guidé" (Capas.jsx).
  const [showCapaForm, setShowCapaForm] = useState(false);
  const [capaForm, setCapaForm] = useState(null);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [severityTouched, setSeverityTouched] = useState(false);
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [selectedActionIndex, setSelectedActionIndex] = useState(null);
  const [users, setUsers] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [capaError, setCapaError] = useState('');
  const [creatingCapa, setCreatingCapa] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/qqoqccp/${id}`)
      .then(({ data }) => {
        setAnalysis(data);
        setForm(buildForm(data));
      })
      .catch(() => setError('Impossible de charger cette analyse.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Annule les sauvegardes en attente si on quitte la page avant la fin du débounce.
  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
      Object.values(savedTimers.current).forEach(clearTimeout);
    },
    []
  );

  // Responsables assignables et délais de traitement par priorité (Paramètres > CAPA),
  // nécessaires au formulaire d'ajustement — chargés d'emblée, le bouton "Passer à
  // l'ouverture de la CAPA" pouvant apparaître sur n'importe quelle analyse.
  useEffect(() => {
    api
      .get('/users')
      .then(({ data }) => setUsers(data))
      .catch(() => {});
    api
      .get('/capas/priority-delays')
      .then(({ data }) => setPriorityDelays(data))
      .catch(() => {});
  }, []);

  // Si les délais arrivent après l'ouverture du formulaire (course avec le clic), ou que la
  // priorité change, recalcule l'échéance suggérée — sauf si l'utilisateur l'a déjà modifiée.
  useEffect(() => {
    if (!showCapaForm || dueDateTouched || !priorityDelays || !capaForm) return;
    const days = getDelayDays(capaForm.priority, priorityDelays);
    if (days) {
      setCapaForm((prev) => (prev ? { ...prev, due_date: addDaysToToday(days) } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityDelays, showCapaForm]);

  function handleFieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldStatus((prev) => ({ ...prev, [field]: undefined }));

    if (timers.current[field]) clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(async () => {
      setFieldStatus((prev) => ({ ...prev, [field]: 'saving' }));
      try {
        await api.patch(`/qqoqccp/${id}`, { [field]: value });
        setFieldStatus((prev) => ({ ...prev, [field]: 'saved' }));
        if (savedTimers.current[field]) clearTimeout(savedTimers.current[field]);
        savedTimers.current[field] = setTimeout(() => {
          setFieldStatus((prev) => (prev[field] === 'saved' ? { ...prev, [field]: undefined } : prev));
        }, 2000);
      } catch {
        setFieldStatus((prev) => ({ ...prev, [field]: 'error' }));
      }
    }, SAVE_DEBOUNCE_MS);
  }

  const filledCount = QUESTIONS.filter(({ key }) => form[key]?.trim()).length;
  const canGenerate = filledCount >= MIN_FIELDS_FOR_GENERATE;
  const hasSuggestion = Boolean(analysis?.ai_synthesis);

  async function handleGenerate() {
    setGenerateError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/qqoqccp/${id}/generate`);
      setAnalysis(data);
    } catch (err) {
      setGenerateError(err.response?.data?.error || 'Impossible de générer une proposition IA.');
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenCapaForm() {
    const suggested = analysis.ai_suggested_actions?.overall_priority || 'medium';
    const causes = analysis.ai_suggested_actions?.root_causes || [];
    const delayDays = getDelayDays(suggested, priorityDelays);

    setCapaForm({
      title: analysis.title,
      service: '',
      priority: suggested,
      severity: suggested,
      root_cause: causes.length > 0 ? causes.map((cause) => `- ${cause}`).join('\n') : '',
      corrective_action: '',
      preventive_action: '',
      assigned_to: '',
      due_date: delayDays ? addDaysToToday(delayDays) : '',
    });
    setPriorityTouched(false);
    setSeverityTouched(false);
    setDueDateTouched(false);
    setSelectedActionIndex(null);
    setCapaError('');
    setShowCapaForm(true);
  }

  function updateCapaField(field, value) {
    setCapaForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCapaPriorityChange(value) {
    setPriorityTouched(true);
    setCapaForm((prev) => {
      const days = getDelayDays(value, priorityDelays);
      return {
        ...prev,
        priority: value,
        due_date: !dueDateTouched && days ? addDaysToToday(days) : prev.due_date,
      };
    });
  }

  function handleCapaSeverityChange(value) {
    setSeverityTouched(true);
    updateCapaField('severity', value);
  }

  function handleCapaDueDateChange(value) {
    setDueDateTouched(true);
    updateCapaField('due_date', value);
  }

  function handleSelectSuggestedAction(index) {
    setSelectedActionIndex(index);
    const action = analysis.ai_suggested_actions.suggested_actions[index];
    updateCapaField('corrective_action', action.description ? `${action.title}\n\n${action.description}` : action.title);
  }

  function handleSelectCustomAction() {
    setSelectedActionIndex('custom');
    updateCapaField('corrective_action', '');
  }

  async function handleCreateCapa(event) {
    event.preventDefault();
    setCapaError('');
    setCreatingCapa(true);

    try {
      const payload = {
        title: capaForm.title,
        service: capaForm.service || undefined,
        priority: capaForm.priority,
        severity: capaForm.severity,
        root_cause: capaForm.root_cause || undefined,
        corrective_action: capaForm.corrective_action || undefined,
        preventive_action: capaForm.preventive_action || undefined,
        assigned_to: capaForm.assigned_to || undefined,
        due_date: capaForm.due_date || undefined,
      };
      const { data } = await api.post(`/qqoqccp/${id}/create-capa`, payload);
      navigate(`/capas/${data.id}`);
    } catch (err) {
      setCapaError(err.response?.data?.error || 'Impossible de créer la CAPA.');
    } finally {
      setCreatingCapa(false);
    }
  }

  // Une CAPA déjà liée (voir GET /qqoqccp/:id, embed "capa" ajouté en B4) pointe vers elle au
  // lieu de proposer d'en recréer une deuxième par erreur — le lien n'est jamais réinitialisé.
  function renderCapaAction() {
    if (showCapaForm) return null;

    if (analysis.capa) {
      return (
        <button
          type="button"
          onClick={() => navigate(`/capas/${analysis.capa.id}`)}
          className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <ClipboardCheck size={18} />
          Voir la CAPA liée — {analysis.capa.number}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleOpenCapaForm}
        className="mt-4 flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
      >
        <ClipboardPlus size={18} />
        Passer à l'ouverture de la CAPA
      </button>
    );
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error || !analysis) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {error || 'Analyse introuvable.'}
      </p>
    );
  }

  const suggestedActions = analysis.ai_suggested_actions?.suggested_actions || [];
  const rootCauses = analysis.ai_suggested_actions?.root_causes || [];
  const overallPriority = analysis.ai_suggested_actions?.overall_priority;
  // Miroir de la règle backend (PATCH /api/qqoqccp/:id) : admin/manager modifient
  // toujours ; un member modifie SA PROPRE analyse tant qu'elle n'est pas validée.
  const canEditAnalysis =
    isManagerRole(currentUser?.role) ||
    (Boolean(currentUser) && analysis.created_by === currentUser.id && analysis.status !== 'validated');

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/qqoqccp')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{analysis.title}</h1>
        <div className="flex items-center gap-2">
          {!canEditAnalysis && <span className="text-xs text-slate-400">Lecture seule</span>}
          <QqoqccpStatusBadge status={analysis.status} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {QUESTIONS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">{label}</label>
              {fieldStatus[key] === 'saving' && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  Enregistrement...
                </span>
              )}
              {fieldStatus[key] === 'saved' && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <Check size={12} />
                  Enregistré
                </span>
              )}
              {fieldStatus[key] === 'error' && (
                <span className="text-xs text-red-600">Échec de l'enregistrement</span>
              )}
            </div>
            <textarea
              rows={2}
              placeholder={placeholder}
              value={form[key] || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              disabled={!canEditAnalysis}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div
          className="inline-block"
          title={!canGenerate ? `Remplissez au moins ${MIN_FIELDS_FOR_GENERATE} des 7 questions avant de générer une proposition.` : undefined}
        >
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Génération en cours...
              </>
            ) : hasSuggestion ? (
              <>
                <RefreshCw size={18} />
                Régénérer
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Générer une proposition IA
              </>
            )}
          </button>
        </div>
        {!canGenerate && (
          <p className="mt-1 text-xs text-slate-400">
            {filledCount}/{MIN_FIELDS_FOR_GENERATE} question{MIN_FIELDS_FOR_GENERATE > 1 ? 's' : ''} minimum remplie{filledCount > 1 ? 's' : ''}.
          </p>
        )}
        {generateError && <p className="mt-2 text-sm text-red-600">{generateError}</p>}
      </div>

      {/* Sous les 7 questions quand pas encore de proposition IA (voir l'autre occurrence
          sous le résultat IA plus bas). */}
      {!hasSuggestion && renderCapaAction()}

      {hasSuggestion && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
              <Sparkles size={12} />
              Généré par IA
            </span>
            {overallPriority && <CapaPriorityBadge priority={overallPriority} />}
          </div>

          <p className="text-sm text-slate-700">{analysis.ai_synthesis}</p>

          {rootCauses.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Causes racines probables</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {rootCauses.map((cause, i) => (
                  <li key={i}>{cause}</li>
                ))}
              </ul>
            </div>
          )}

          {suggestedActions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Actions suggérées</h3>
              <div className="mt-2 space-y-2">
                {suggestedActions.map((action, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{action.title}</p>
                      <CapaPriorityBadge priority={action.suggested_priority} />
                    </div>
                    {action.description && <p className="mt-1 text-sm text-slate-600">{action.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasSuggestion && renderCapaAction()}

      {showCapaForm && capaForm && (
        <CapaAdjustmentForm
          form={capaForm}
          users={users}
          priorityDelays={priorityDelays}
          priorityTouched={priorityTouched}
          severityTouched={severityTouched}
          dueDateTouched={dueDateTouched}
          suggestedActions={suggestedActions}
          selectedActionIndex={selectedActionIndex}
          onFieldChange={updateCapaField}
          onPriorityChange={handleCapaPriorityChange}
          onSeverityChange={handleCapaSeverityChange}
          onDueDateChange={handleCapaDueDateChange}
          onSelectAction={handleSelectSuggestedAction}
          onSelectCustomAction={handleSelectCustomAction}
          onSubmit={handleCreateCapa}
          submitting={creatingCapa}
          error={capaError}
        />
      )}
    </div>
  );
}
