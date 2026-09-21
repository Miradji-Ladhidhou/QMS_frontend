import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSmartBack } from '../lib/useSmartBack.js';
import { AlertTriangle, ArrowLeft, ClipboardCheck, Info, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useUsers } from '../lib/useUsers.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { SUPPLIER_STATUS_LABELS, EVALUATION_DECISION_LABELS } from '../lib/supplierStatus.js';
import { getPdfDownload, getWordDownload } from '../lib/pdfExport.js';
import { CRITERIA, EVALUATION_STATE_LABELS, EVALUATION_STATE_STYLES, describeWeights, formatIsoDate, formatScore, isMoreLenient, suggestDecision, weightedScore } from '../lib/supplierPolicy.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import SupplierStatusBadge from '../components/SupplierStatusBadge.jsx';
import EvaluationDecisionBadge from '../components/EvaluationDecisionBadge.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import PageGuide from '../components/PageGuide.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import SupplierScoreChart from '../components/suppliers/SupplierScoreChart.jsx';
import SupplierDocumentsCard from '../components/suppliers/SupplierDocumentsCard.jsx';

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

function EditSupplierModal({ supplier, services, users, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: supplier.name,
    category: supplier.category || '',
    contact_name: supplier.contact_name || '',
    contact_email: supplier.contact_email || '',
    contact_phone: supplier.contact_phone || '',
    criticality: supplier.criticality,
    status: supplier.status,
    service_id: supplier.service_id || '',
    owner: supplier.owner || '',
    category_id: supplier.category_id || '',
    category_name: supplier.folder?.name || '',
    next_evaluation_date: supplier.next_evaluation_date || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(supplier.is_private_to_me));
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
        categoryId = await resolvePersonalCategoryId('supplier');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // eslint-disable-next-line no-unused-vars
    const { category_name, ...formForApi } = form;
    // La prochaine évaluation se date toute seule (dernière évaluation + rythme de la criticité) : on n'envoie la
    // date que si la personne l'a réellement changée, sinon un changement de criticité ne pourrait pas la recalculer.
    if (form.next_evaluation_date === (supplier.next_evaluation_date || '')) delete formForApi.next_evaluation_date;

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence —
    // un bug dans le parent ne doit jamais se faire passer pour un échec de la modification.
    let data;
    try {
      ({ data } = await api.patch(`/suppliers/${supplier.id}`, { ...formForApi, category_id: categoryId }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier ce fournisseur.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <p className="mt-1 text-xs text-slate-400">Datée automatiquement après chaque évaluation, selon la criticité.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable du suivi</label>
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
              <p className="mt-1 text-xs text-slate-400">Prévenu par email des évaluations à faire et des certificats qui expirent.</p>
            </div>
          </div>

          <CategoryVisibilityField
            baseUrl="/module-categories"
            resourceType="supplier"
            categoryName={form.category_name}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            onCategoryNameChange={(value) => updateField('category_name', value)}
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

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence —
    // un bug dans le parent ne doit jamais se faire passer pour un échec de la création.
    let data;
    try {
      ({ data } = await api.post(`/suppliers/${supplierId}/evaluations/${evaluation.id}/create-capa`, payload));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la CAPA.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
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

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack('/suppliers');
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [supplier, setSupplier] = useState(null);
  const users = useUsers();
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
  const [decisionTouched, setDecisionTouched] = useState(false);
  const [exporting, setExporting] = useState({ pdf: false, word: false });
  const [notice, setNotice] = useState('');

  // Recharge la fiche sans écran de chargement : la prochaine évaluation, le statut et l'état d'évaluation sont
  // recalculés par le serveur après chaque évaluation.
  async function refreshSupplier() {
    try {
      const { data } = await api.get(`/suppliers/${id}`);
      setSupplier(data);
    } catch {
      /* la fiche déjà affichée reste valable */
    }
  }

  async function handleExport(format) {
    setExporting((prev) => ({ ...prev, [format]: true }));
    setError('');
    const baseName = `fournisseur-${supplier.name.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, '-').slice(0, 50)}`;
    try {
      if (format === 'pdf') await getPdfDownload(`/suppliers/${id}/pdf`, `${baseName}.pdf`);
      else await getWordDownload(`/suppliers/${id}/word`, `${baseName}.docx`);
    } catch {
      setError(`Impossible de générer la fiche ${format === 'pdf' ? 'PDF' : 'Word'}.`);
    } finally {
      setExporting((prev) => ({ ...prev, [format]: false }));
    }
  }

  // Note pondérée et décision proposée, calculées en direct avec les poids et seuils de l'entreprise.
  const policy = supplier?.policy;
  const liveScores = { quality: Number(evaluationForm.quality_score), delivery: Number(evaluationForm.delivery_score), price: Number(evaluationForm.price_score), responsiveness: Number(evaluationForm.responsiveness_score) };
  const liveScore = policy ? weightedScore(liveScores, policy.weights) : null;
  const suggested = policy && liveScore !== null ? suggestDecision(liveScore, policy.thresholds) : 'maintained';
  const decisionForForm = decisionTouched ? evaluationForm.decision : suggested;
  const needsJustification = decisionForForm !== 'maintained' || isMoreLenient(decisionForForm, suggested);

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
        decision: decisionForForm,
        quality_score: Number(evaluationForm.quality_score),
        delivery_score: Number(evaluationForm.delivery_score),
        price_score: Number(evaluationForm.price_score),
        responsiveness_score: Number(evaluationForm.responsiveness_score),
      });
      setIsEvaluationModalOpen(false);
      setDecisionTouched(false);
      setEvaluationForm((prev) => ({ ...prev, quality_score: '3', delivery_score: '3', price_score: '3', responsiveness_score: '3', decision: 'maintained', comment: '' }));
      setNotice(
        [
          data.supplier_update?.next_evaluation_date ? `Prochaine évaluation fixée au ${formatIsoDate(data.supplier_update.next_evaluation_date)}.` : '',
          data.supplier_update?.status === 'suspended' ? 'Le fournisseur est passé « suspendu » (décision « à remplacer »).' : '',
        ]
          .filter(Boolean)
          .join(' ')
      );
      await refreshSupplier();
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
      await refreshSupplier();
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
        onClick={goBack}
        className="-ml-1 mb-2 flex min-h-[40px] items-center gap-1 px-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="min-w-0 break-words text-lg font-semibold text-slate-900 sm:text-xl">{supplier.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportMenu onExportPdf={() => handleExport('pdf')} exportingPdf={exporting.pdf} onExportWord={() => handleExport('word')} exportingWord={exporting.word} />
          <CapaPriorityBadge priority={supplier.criticality} />
          <SupplierStatusBadge status={supplier.status} />
          {canManage && (
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
                onClick={handleDelete}
                aria-label="Supprimer"
                className="rounded-md p-3 text-slate-500 hover:bg-slate-100 hover:text-red-600 sm:p-2"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
      <PageGuide id="supplierDetail" />

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
          {supplier.evaluation_state && supplier.evaluation_state !== 'ok' && (
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${EVALUATION_STATE_STYLES[supplier.evaluation_state]}`}>{EVALUATION_STATE_LABELS[supplier.evaluation_state]}</span>
          )}
          <p className="mt-0.5 text-xs text-slate-400">Tous les {supplier.policy.frequency_months} mois</p>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <p className="text-xs text-slate-500">Responsable du suivi</p>
          <p className="text-sm font-medium text-slate-800">{supplier.owner_user?.full_name || 'À désigner'}</p>
        </div>
      </div>

      {notice && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <Info size={15} className="mt-0.5 shrink-0" />
          {notice}
        </p>
      )}

      <SupplierScoreChart evaluations={supplier.evaluations} thresholds={supplier.policy.thresholds} />
      <SupplierDocumentsCard supplierId={id} documents={supplier.documents} canManage={canManage} onChange={(documents) => setSupplier((prev) => ({ ...prev, documents }))} />

      {supplier.evaluations[0]?.decision === 'to_replace' && !supplier.evaluations[0]?.linked_capa && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>La dernière évaluation recommande de remplacer ce fournisseur — envisagez d'ouvrir une CAPA.</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Évaluations ({supplier.evaluations.length})</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setIsEvaluationModalOpen(true)}
            className="flex min-h-[40px] items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatDate(evaluation.evaluation_date)}</p>
                  <p className="text-xs text-slate-500">{evaluation.evaluator?.full_name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Note globale : {formatScore(evaluation.score ?? evaluation.overall_score)}
                  </span>
                  <EvaluationDecisionBadge decision={evaluation.decision} />
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEvaluation(evaluation)}
                      aria-label="Supprimer l'évaluation"
                      className="-m-2 p-3 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SCORE_FIELDS.map(({ key, label }) => (
                  <div key={key} className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
                    <p className="text-sm font-semibold text-slate-800">{evaluation[key]}/5</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {evaluation.weights && <p className="mt-2 text-xs text-slate-400">Poids : {describeWeights(evaluation.weights)}</p>}
              {evaluation.comment && <p className="mt-2 break-words text-sm text-slate-700">{evaluation.comment}</p>}

              {evaluation.linked_capa ? (
                <Link
                  to={`/capas/${evaluation.linked_capa.id}`}
                  className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 sm:min-h-0"
                >
                  <ClipboardCheck size={14} />
                  Voir la CAPA liée — {evaluation.linked_capa.number}
                </Link>
              ) : (
                canManage && (
                  <button
                    type="button"
                    onClick={() => setCapaModalEvaluation(evaluation)}
                    className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 sm:min-h-0"
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
          users={users}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(data) => {
            setSupplier((prev) => ({ ...prev, ...data }));
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isEvaluationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nouvelle évaluation</h2>
              <button
                type="button"
                onClick={() => setIsEvaluationModalOpen(false)}
                aria-label="Fermer"
                className="-m-2 p-2.5 text-slate-500 hover:text-slate-700"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SCORE_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {label}
                      {policy && <span className="ml-1 text-xs font-normal text-slate-400">(poids ×{policy.weights[CRITERIA.find((criterion) => criterion.scoreKey === key).key]})</span>}
                    </label>
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

              {liveScore !== null && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm" role="status">
                  <p className="text-slate-700">
                    Note globale pondérée : <strong className="text-slate-900">{formatScore(liveScore)}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Décision proposée : <strong>{EVALUATION_DECISION_LABELS[suggested]}</strong> (sous {policy.thresholds.watch} : sous surveillance ; sous {policy.thresholds.replace} : à remplacer).
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Décision</label>
                <select
                  value={decisionForForm}
                  onChange={(e) => {
                    setDecisionTouched(true);
                    setEvaluationForm((prev) => ({ ...prev, decision: e.target.value }));
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {Object.entries(EVALUATION_DECISION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                      {value === suggested ? ' (proposée)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Commentaire
                  {needsJustification && (isMoreLenient(decisionForForm, suggested) ? ' (justifiez cet écart avec la décision proposée)' : ' (justifiez cette décision)')}
                </label>
                <AutoTextarea
                  rows={2}
                  required={needsJustification}
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
