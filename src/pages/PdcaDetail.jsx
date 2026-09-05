import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Loader2, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { PDCA_PHASES, PDCA_STATUS_LABELS } from '../lib/pdcaStatus.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import PdcaStatusBadge from '../components/PdcaStatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
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

// Délai de traitement (en jours) paramétré pour la gravité choisie (Paramètres > CAPA).
function getDelayDays(priority, priorityDelays) {
  return priorityDelays?.[priority] ?? null;
}

function isTargetOverdue(pdca) {
  if (!pdca.target_date || pdca.status === 'closed') return false;
  return pdca.target_date < new Date().toISOString().slice(0, 10);
}

function draftsFromPdca(pdca) {
  return {
    plan: pdca.plan_content || '',
    do: pdca.do_content || '',
    check: pdca.check_content || '',
    act: pdca.act_content || '',
  };
}

function EditPdcaModal({ pdca, users, services, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: pdca.title,
    description: pdca.description || '',
    service_id: pdca.service_id || '',
    owner: pdca.owner || '',
    target_date: pdca.target_date || '',
    category_id: pdca.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(pdca.is_private_to_me));
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
        categoryId = await resolvePersonalCategoryId('pdca');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.patch(`/pdca/${pdca.id}`, { ...form, category_id: categoryId });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier ce projet.');
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
          <h2 className="text-lg font-semibold text-slate-900">Modifier le projet PDCA</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <AutoTextarea
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
              <select
                value={form.owner}
                onChange={(e) => updateField('owner', e.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Date cible</label>
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => updateField('target_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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

// Miroir de CreateAccidentCapaModal (AccidentDetail.jsx) : PDCA n'a pas de champ de
// sévérité/urgence à mapper (contrairement à accidents.severity), la priorité démarre donc
// simplement à 'medium'. description préremplie depuis act_content (où "ceci nécessite un
// suivi formel" se décide) avec repli sur check_content puis la description du projet ;
// root_cause préremplie depuis check_content uniquement (diagnostic le plus proche d'une cause
// dans un cycle PDCA), distinct de description pour ne pas dupliquer le même texte.
function CreatePdcaCapaModal({ pdcaId, pdca, users, services, priorityDelays, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: `Projet PDCA — ${pdca.title}`,
    service_id: pdca.service_id || '',
    priority: 'medium',
    severity: 'medium',
    assigned_to: '',
    due_date: priorityDelays ? addDaysToToday(priorityDelays.medium) : '',
    root_cause: pdca.check_content || '',
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

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post(`/pdca/${pdcaId}/create-capa`, payload);
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
          <h2 className="text-lg font-semibold text-slate-900">Créer une CAPA depuis ce projet PDCA</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

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
            context={`Projet PDCA : ${pdca.title}${pdca.description ? `. ${pdca.description}` : ''}${pdca.act_content ? ` Conclusion (Act) : ${pdca.act_content}` : ''}`}
            onGenerated={handleAiGenerated}
            onSelectAction={handleAiSelectAction}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priorité</label>
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

// Une carte par phase, dans les 4 toujours affichées dans l'ordre plan → do → check → act. Trois
// états visuels : future (grisée, pas encore atteinte — on ne documente jamais une phase à
// l'avance), passée/clôturée (contenu en lecture seule, modifiable via le crayon — correction
// d'une coquille sans repasser par l'avancement séquentiel) et courante (zone de saisie ouverte
// en permanence + bouton d'avancement).
function PhaseCard({ phase, label, state, content, completedAt, draft, onDraftChange, canEdit, isEditing, onStartEdit, onCancelEdit, onSave, saving, onAdvance, advancing, isLastPhase, onGenerate, generating }) {
  if (state === 'future') {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 opacity-60 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-500">{label}</h3>
        <p className="mt-1 text-sm text-slate-400">Étape pas encore atteinte.</p>
      </div>
    );
  }

  const showEditor = state === 'current' || isEditing;

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${state === 'current' ? 'border-primary/40' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <div className="flex items-center gap-2">
          {completedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Check size={12} />
              Terminé le {formatDate(completedAt)}
            </span>
          )}
          {state === 'current' && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">En cours</span>
          )}
          {state === 'past' && canEdit && !isEditing && (
            <button type="button" onClick={onStartEdit} aria-label={`Modifier ${label}`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-primary">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {showEditor && canEdit ? (
        <div className="mt-3 space-y-3">
          <AutoTextarea
            rows={3}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={`Documentez l'étape ${label}...`}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <div className="flex flex-wrap items-center gap-2">
            {state === 'current' && onGenerate && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-60"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? 'Génération...' : "Générer avec l'IA"}
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving || (state === 'current' && generating)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {state === 'current' && (
              // Avancer pendant qu'une génération IA est en cours pourrait faire arriver la
              // suggestion APRÈS le changement de phase : elle serait alors écrite dans le
              // brouillon de l'étape déjà quittée (drafts[pdca.status] capturé au clic, devenu
              // obsolète) — désactivé le temps de la génération pour empêcher ce chevauchement.
              <button
                type="button"
                onClick={onAdvance}
                disabled={advancing || generating}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {advancing ? 'Avancement...' : isLastPhase ? 'Clôturer le projet' : "Passer à l'étape suivante"}
                {!advancing && <ArrowRight size={16} />}
              </button>
            )}
            {isEditing && (
              <button type="button" onClick={onCancelEdit} className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                Annuler
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{content || 'Pas encore documenté.'}</p>
      )}
    </div>
  );
}

export default function PdcaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [pdca, setPdca] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);
  const [drafts, setDrafts] = useState({ plan: '', do: '', check: '', act: '' });
  const [editingPhase, setEditingPhase] = useState(null);
  const [savingPhase, setSavingPhase] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function loadPdca() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/pdca/${id}`);
      setPdca(data);
      setDrafts(draftsFromPdca(data));
    } catch {
      setError('Impossible de charger ce projet PDCA.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPdca();
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
    api
      .get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.is_active)))
      .catch(() => {});
    api
      .get('/module-categories', { params: { resource_type: 'pdca' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
    api.get('/capas/priority-delays').then(({ data }) => setPriorityDelays(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canEdit = canManage || pdca?.created_by === currentUser?.id;
  const canDelete = currentUser?.role === 'admin' || pdca?.created_by === currentUser?.id;

  async function handleSavePhase(phase) {
    setError('');
    setSavingPhase(phase);
    try {
      const { data } = await api.patch(`/pdca/${id}`, { [`${phase}_content`]: drafts[phase] });
      setPdca(data);
      setDrafts(draftsFromPdca(data));
      setEditingPhase(null);
    } catch (err) {
      setError(err.response?.data?.error || `Impossible d'enregistrer l'étape ${phase}.`);
    } finally {
      setSavingPhase(null);
    }
  }

  async function handleAdvance() {
    setError('');
    setAdvancing(true);
    try {
      // La phase courante doit être sauvegardée avant l'avancement : le backend refuse de faire
      // progresser un projet dont la phase quittée n'est pas documentée (voir POST
      // /pdca/:id/advance dans pdca.js).
      await api.patch(`/pdca/${id}`, { [`${pdca.status}_content`]: drafts[pdca.status] });
      const { data } = await api.post(`/pdca/${id}/advance`, {});
      setPdca(data);
      setDrafts(draftsFromPdca(data));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de faire avancer ce projet PDCA.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleGeneratePhase() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/pdca/${id}/generate`);
      setDrafts((prev) => ({ ...prev, [pdca.status]: data.content }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer une suggestion IA.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement "${pdca.title}" ?`)) return;
    try {
      await api.delete(`/pdca/${id}`);
      navigate('/pdca');
    } catch {
      setError('Impossible de supprimer ce projet PDCA.');
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error && !pdca) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  }

  if (!pdca) return null;

  const currentPhaseIndex = pdca.status === 'closed' ? PDCA_PHASES.length : PDCA_PHASES.indexOf(pdca.status);
  const overdue = isTargetOverdue(pdca);

  return (
    <div>
      <button type="button" onClick={() => navigate('/pdca')} className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{pdca.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <PdcaStatusBadge status={pdca.status} />
          {canEdit && (
            <button type="button" onClick={() => setIsEditModalOpen(true)} aria-label="Modifier" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary">
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={handleDelete} aria-label="Supprimer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs text-slate-500">Dossier</p>
          <div className="mt-0.5">
            <CategoryBadge category={pdca.category} />
            {!pdca.category && <span className="text-sm text-slate-400">—</span>}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">Service concerné</p>
          <p className="text-sm font-medium text-slate-800">{pdca.service?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Responsable</p>
          <p className="text-sm font-medium text-slate-800">{pdca.owner_user?.full_name || 'À désigner'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Date cible</p>
          <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-800'}`}>{formatDate(pdca.target_date)}</p>
        </div>
        {pdca.description && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-slate-500">Description</p>
            <p className="text-sm text-slate-700">{pdca.description}</p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {PDCA_PHASES.map((phase, index) => {
          const state = index < currentPhaseIndex ? 'past' : index === currentPhaseIndex ? 'current' : 'future';
          return (
            <PhaseCard
              key={phase}
              phase={phase}
              label={PDCA_STATUS_LABELS[phase]}
              state={state}
              content={pdca[`${phase}_content`]}
              completedAt={pdca[`${phase}_completed_at`]}
              draft={drafts[phase]}
              onDraftChange={(value) => setDrafts((prev) => ({ ...prev, [phase]: value }))}
              canEdit={canEdit}
              isEditing={editingPhase === phase}
              onStartEdit={() => setEditingPhase(phase)}
              onCancelEdit={() => {
                setEditingPhase(null);
                setDrafts((prev) => ({ ...prev, [phase]: pdca[`${phase}_content`] || '' }));
              }}
              onSave={() => handleSavePhase(phase)}
              saving={savingPhase === phase}
              onAdvance={handleAdvance}
              advancing={advancing}
              isLastPhase={phase === 'act'}
              onGenerate={canEdit ? handleGeneratePhase : undefined}
              generating={generating}
            />
          );
        })}
      </div>

      <div className="mt-4">
        {pdca.linked_capa ? (
          <Link
            to={`/capas/${pdca.linked_capa.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <ClipboardCheck size={18} />
            Voir la CAPA liée — {pdca.linked_capa.number}
          </Link>
        ) : (
          canEdit && (
            <button
              type="button"
              onClick={() => setIsCapaModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <ClipboardCheck size={18} />
              Créer une CAPA
            </button>
          )
        )}
      </div>

      {pdca.status === 'closed' && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Ce projet PDCA est clôturé{pdca.closed_at ? ` depuis le ${formatDate(pdca.closed_at)}` : ''}.
        </p>
      )}

      {isCapaModalOpen && (
        <CreatePdcaCapaModal
          pdcaId={id}
          pdca={pdca}
          users={users}
          services={services}
          priorityDelays={priorityDelays}
          onClose={() => setIsCapaModalOpen(false)}
          onCreated={(capa) => {
            setPdca((prev) => ({ ...prev, linked_capa: capa }));
            setIsCapaModalOpen(false);
          }}
        />
      )}

      {isEditModalOpen && (
        <EditPdcaModal
          pdca={pdca}
          users={users}
          services={services}
          categories={categories}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setPdca((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
