import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Cloud, Download, Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { CAPA_EFFECTIVENESS_LABELS, CAPA_PRIORITY_LABELS, CAPA_STATUS_LABELS } from '../lib/capaStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx, exportToDrive } from '../lib/pdfExport.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import CapaStatusBadge from '../components/CapaStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortableTh from '../components/SortableTh.jsx';
import SortSelect from '../components/SortSelect.jsx';

const PRIORITY_RANK = Object.fromEntries(Object.keys(CAPA_PRIORITY_LABELS).map((key, i) => [key, i]));
const STATUS_RANK = Object.fromEntries(Object.keys(CAPA_STATUS_LABELS).map((key, i) => [key, i]));

const CAPA_SORT_OPTIONS = [
  { key: 'due_date', label: 'échéance' },
  { key: 'number', label: 'numéro' },
  { key: 'title', label: 'objet' },
  { key: 'service', label: 'service' },
  { key: 'priority', label: 'gravité' },
  { key: 'status', label: 'statut' },
];

function getCapaSortValue(capa, key) {
  switch (key) {
    case 'service':
      return capa.service?.name || '';
    case 'priority':
      return PRIORITY_RANK[capa.priority] ?? -1;
    case 'status':
      return STATUS_RANK[capa.status] ?? -1;
    default:
      return capa[key];
  }
}

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

// Délai de traitement (en jours) paramétré pour le niveau de gravité de cette CAPA
// (Paramètres > CAPA). null tant que la config n'est pas chargée ou pour une gravité
// inconnue — ne jamais planter l'affichage sur une valeur manquante.
function getDelayDays(priority, priorityDelays) {
  return priorityDelays?.[priority] ?? null;
}

function CounterCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

// Première étape du bouton "Nouvelle CAPA" : choisir entre partir d'un diagnostic QQOQCCP
// guidé (mis en avant) ou aller directement au formulaire de création classique.
function NewCapaChoiceModal({ onClose, onSelectGuided, onSelectQuick }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle CAPA</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onSelectGuided}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Sparkles size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-900">Diagnostic guidé (QQOQCCP)</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Structurez le problème avec les 7 questions et une proposition IA avant de créer la CAPA.
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-primary" />
          </button>

          <button
            type="button"
            onClick={onSelectQuick}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Plus size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-900">Création rapide</span>
              <span className="mt-0.5 block text-sm text-slate-500">Ouvre directement le formulaire CAPA classique.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Démarre un diagnostic QQOQCCP depuis la CAPA : un simple titre, puis redirection vers le
// détail QQOQCCP (?flow=capa signale au frontend qu'on revient créer une CAPA à la fin).
function GuidedDiagnosticModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — une
    // redirection ratée dans le parent ne doit pas se faire passer pour un échec de l'API.
    let data;
    try {
      ({ data } = await api.post('/qqoqccp/quick-start', { title }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de démarrer le diagnostic.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Diagnostic guidé</h2>
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
              autoFocus
              placeholder="Ex : Rupture de stock composant X"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Démarrage...' : 'Démarrer le diagnostic'}
          </button>
        </form>
      </div>
    </div>
  );
}

function NewCapaModal({ users, services, categories, priorityDelays, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    service_id: '',
    category_id: '',
    description: '',
    origin: '',
    priority: 'medium',
    due_date: priorityDelays ? addDaysToToday(priorityDelays.medium) : '',
    assigned_to: '',
    root_cause: '',
    corrective_action: '',
    preventive_action: '',
  });
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Le champ Échéance se met à jour tout seul en fonction de la gravité et du délai
  // paramétré (Paramètres > CAPA), tant que l'utilisateur ne l'a pas modifié à la main.
  function handlePriorityChange(priority) {
    setForm((prev) => ({
      ...prev,
      priority,
      due_date: !dueDateTouched && priorityDelays ? addDaysToToday(priorityDelays[priority]) : prev.due_date,
    }));
  }

  function handleAiGenerated(suggestion) {
    if (suggestion.overall_priority) handlePriorityChange(suggestion.overall_priority);
    setForm((prev) => ({
      ...prev,
      title: suggestion.title || prev.title,
      description: suggestion.synthesis || prev.description,
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

    let categoryId = form.category_id || undefined;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('capa');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      service_id: form.service_id || undefined,
      category_id: categoryId,
      description: form.description || undefined,
      priority: form.priority,
      // severity reste en base (voir schema.sql) mais n'est plus un champ distinct dans
      // aucun formulaire de création CAPA — toujours miroir de la gravité choisie, comme
      // les 5 flux "créer une CAPA depuis X" et QqoqccpDetail.jsx.
      severity: form.priority,
      origin: form.origin || undefined,
      due_date: form.due_date || undefined,
      assigned_to: form.assigned_to || undefined,
      root_cause: form.root_cause || undefined,
      corrective_action: form.corrective_action || undefined,
      preventive_action: form.preventive_action || undefined,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence.
    let data;
    try {
      ({ data } = await api.post('/capas', payload));
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
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle CAPA</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description de la non-conformité</label>
            <AutoTextarea
              rows={3}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Origine</label>
            <input
              type="text"
              placeholder="Audit, réclamation client, non-conformité..."
              value={form.origin}
              onChange={(e) => updateField('origin', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <AiCapaSuggestion
            context={`${form.title}${form.description ? `. ${form.description}` : ''}`}
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
                <option value="">Aucun service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              {services.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">Aucun service configuré.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable assigné</label>
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
            {submitting ? 'Création...' : 'Créer la CAPA'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Capas() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [capas, setCapas] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} CAPA sélectionnée(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/capas/bulk', { data: { ids: selectedIds } });
      setCapas((prev) => prev.filter((capa) => !selectedIds.includes(capa.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces CAPA.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [capasRes, usersRes, delaysRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/capas'),
        api.get('/users'),
        api.get('/capas/priority-delays'),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'capa' } }),
      ]);
      setCapas(capasRes.data);
      setUsers(usersRes.data);
      setPriorityDelays(delaysRes.data);
      // GET /services renvoie aussi les services désactivés (nécessaire à la page de
      // gestion) — un formulaire de création ne doit proposer que les actifs.
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les CAPA.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const counters = useMemo(
    () => ({
      open: capas.filter((capa) => capa.status === 'open').length,
      in_progress: capas.filter((capa) => capa.status === 'in_progress').length,
      pending_verification: capas.filter((capa) => capa.status === 'pending_verification').length,
      overdue: capas.filter((capa) => capa.status === 'overdue').length,
      closed: capas.filter((capa) => capa.status === 'closed').length,
    }),
    [capas]
  );

  // Recherche client (jamais un appel serveur) : les CAPA du tenant sont déjà toutes chargées
  // par loadData, comme sur Planning.jsx — sur numéro, objet et description, les 3 champs qui
  // identifient une CAPA au premier coup d'œil.
  const filteredCapas = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return capas;
    return capas.filter(
      (capa) =>
        capa.number?.toLowerCase().includes(query) ||
        capa.title?.toLowerCase().includes(query) ||
        capa.description?.toLowerCase().includes(query)
    );
  }, [capas, searchText]);

  const { sorted: sortedCapas, sortKey, direction, setSortKey, toggleSort } = useSort(
    filteredCapas,
    getCapaSortValue,
    'due_date',
    'asc'
  );

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? capas.filter((capa) => scopeIds.includes(capa.id)) : sortedCapas;
    const headers = [
      'Numéro',
      'Date',
      'Service',
      'Description de la non-conformité',
      'Gravité',
      'Délai de traitement (jours)',
      'Échéance',
      'Cause identifiée',
      'Action corrective',
      'Action préventive',
      'Responsable',
      'Statut',
      'Vérification efficacité',
      'Date clôture',
      'Commentaire',
    ];
    const rows = source.map((capa) => [
      capa.number,
      formatDate(capa.created_at),
      capa.service?.name || '',
      capa.description || '',
      CAPA_PRIORITY_LABELS[capa.priority] || capa.priority,
      getDelayDays(capa.priority, priorityDelays) ?? '',
      formatDate(capa.due_date),
      capa.root_cause || '',
      capa.corrective_action || '',
      capa.preventive_action || '',
      capa.assigned?.full_name || '',
      CAPA_STATUS_LABELS[capa.status] || capa.status,
      CAPA_EFFECTIVENESS_LABELS[capa.effectiveness_verified] || '',
      formatDate(capa.closed_at),
      capa.comment || '',
    ]);

    exportToCsv(`capa-${new Date().toISOString().slice(0, 10)}.csv`, 'CAPA', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: `${source.length} CAPA`,
    });
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? capas.filter((capa) => scopeIds.includes(capa.id)) : sortedCapas;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'number', label: 'Numéro', width: 0.11 },
        { key: 'title', label: 'Objet', width: 0.28 },
        { key: 'priority', label: 'Gravité', width: 0.11 },
        { key: 'status', label: 'Statut', width: 0.13 },
        { key: 'due_date', label: 'Échéance', width: 0.13 },
        { key: 'assigned', label: 'Responsable', width: 0.24 },
      ];
      const rows = source.map((capa) => ({
        number: capa.number,
        title: capa.title,
        priority: CAPA_PRIORITY_LABELS[capa.priority] || capa.priority,
        status: CAPA_STATUS_LABELS[capa.status] || capa.status,
        due_date: formatDate(capa.due_date),
        assigned: capa.assigned?.full_name || '',
      }));
      await exportToPdf(`capa-${new Date().toISOString().slice(0, 10)}.pdf`, 'CAPA', columns, rows, {
        subtitle: `${source.length} CAPA`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? capas.filter((capa) => scopeIds.includes(capa.id)) : sortedCapas;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'number', label: 'Numéro' },
        { key: 'title', label: 'Objet' },
        { key: 'priority', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'due_date', label: 'Échéance' },
        { key: 'assigned', label: 'Responsable' },
      ];
      const rows = source.map((capa) => ({
        number: capa.number,
        title: capa.title,
        priority: CAPA_PRIORITY_LABELS[capa.priority] || capa.priority,
        status: CAPA_STATUS_LABELS[capa.status] || capa.status,
        due_date: formatDate(capa.due_date),
        assigned: capa.assigned?.full_name || '',
      }));
      await exportToXlsx(`capa-${new Date().toISOString().slice(0, 10)}.xlsx`, 'CAPA', columns, rows, {
        subtitle: `${source.length} CAPA`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? capas.filter((capa) => scopeIds.includes(capa.id)) : sortedCapas;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'number', label: 'Numéro' },
        { key: 'title', label: 'Objet' },
        { key: 'priority', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'due_date', label: 'Échéance' },
        { key: 'assigned', label: 'Responsable' },
      ];
      const rows = source.map((capa) => ({
        number: capa.number,
        title: capa.title,
        priority: CAPA_PRIORITY_LABELS[capa.priority] || capa.priority,
        status: CAPA_STATUS_LABELS[capa.status] || capa.status,
        due_date: formatDate(capa.due_date),
        assigned: capa.assigned?.full_name || '',
      }));
      await exportToDrive('CAPA', 'CAPA', columns, rows, { subtitle: `${source.length} CAPA`, generatedBy: currentUser?.full_name });
      setDriveSuccess('Enregistré sur le Drive partagé.');
    } catch (err) {
      setExportPdfError(err.response?.data?.error || "Impossible d'enregistrer sur le Drive.");
    } finally {
      setExportingDrive(false);
    }
  }

  function handleCreated(newCapa) {
    setCapas((prev) => [newCapa, ...prev]);
    setIsModalOpen(false);
  }

  function handleGuidedCreated(analysis) {
    setIsGuidedModalOpen(false);
    navigate(`/qqoqccp/${analysis.id}?flow=capa`);
  }

  async function handleStatusChange(event, capa) {
    event.stopPropagation();
    const status = event.target.value;
    setUpdatingId(capa.id);

    try {
      const { data } = await api.patch(`/capas/${capa.id}`, { status });
      setCapas((prev) => prev.map((item) => (item.id === capa.id ? data : item)));
    } catch {
      setError('Impossible de mettre à jour le statut.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">CAPA</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={sortedCapas.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || sortedCapas.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => handleExportXlsx()}
            disabled={exportingXlsx || sortedCapas.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingXlsx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter Excel
          </button>
          {tenant?.storage_provider === 'google_drive' && (
            <button
              type="button"
              onClick={() => handleExportDrive()}
              disabled={exportingDrive || sortedCapas.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              {exportingDrive ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
              Enregistrer sur Drive
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsChoiceModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouvelle CAPA
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CounterCard label="Ouvertes" value={counters.open} accent="text-blue-700" />
        <CounterCard label="En cours" value={counters.in_progress} accent="text-amber-700" />
        <CounterCard label="En vérification" value={counters.pending_verification} accent="text-purple-700" />
        <CounterCard label="En retard" value={counters.overdue} accent="text-red-700" />
        <CounterCard label="Clôturées" value={counters.closed} accent="text-emerald-700" />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, objet ou description..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <SortSelect
          options={CAPA_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {canManage && (
        <SelectAllToggle ids={sortedCapas.map((capa) => capa.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedIds)}
          onExportPdf={() => handleExportPdf(selectedIds)}
          exportingPdf={exportingPdf}
          onExportXlsx={() => handleExportXlsx(selectedIds)}
          exportingXlsx={exportingXlsx}
          onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive(selectedIds) : undefined}
          exportingDrive={exportingDrive}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : capas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune CAPA pour l'instant.</p>
      ) : sortedCapas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune CAPA ne correspond à cette recherche.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {sortedCapas.map((capa) => (
              <div
                key={capa.id}
                onClick={() => navigate(`/capas/${capa.id}`)}
                className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm ${
                  capa.status === 'overdue' ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(capa.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(capa.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{capa.title}</p>
                      <p className="text-sm text-slate-500">
                        {capa.number} · {capa.service?.name || 'Service non précisé'}
                      </p>
                    </div>
                  </div>
                  <CapaPriorityBadge priority={capa.priority} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <CapaStatusBadge status={capa.status} />
                  <span className="text-sm text-slate-500">Échéance : {formatDate(capa.due_date)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Délai de traitement : {getDelayDays(capa.priority, priorityDelays) ?? '—'} jours
                </p>
                {canManage && (
                  <select
                    value={capa.status}
                    disabled={updatingId === capa.id}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(e, capa)}
                    className="mt-3 w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {Object.entries(CAPA_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {canManage && <th className="w-8 px-4 py-3" />}
                  <SortableTh label="Numéro" sortKey="number" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Objet" sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Service" sortKey="service" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Gravité" sortKey="priority" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-4 py-3">Délai de traitement</th>
                  <SortableTh label="Échéance" sortKey="due_date" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCapas.map((capa) => (
                  <tr
                    key={capa.id}
                    onClick={() => navigate(`/capas/${capa.id}`)}
                    className={`cursor-pointer hover:bg-slate-50 ${capa.status === 'overdue' ? 'bg-red-50/50' : ''}`}
                  >
                    {canManage && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(capa.id)}
                          onChange={() => toggleSelect(capa.id)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-slate-800">{capa.number}</td>
                    <td className="px-4 py-3 text-slate-700">{capa.title}</td>
                    <td className="px-4 py-3 text-slate-600">{capa.service?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <CapaPriorityBadge priority={capa.priority} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {getDelayDays(capa.priority, priorityDelays) ?? '—'} jours
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(capa.due_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CapaStatusBadge status={capa.status} />
                        {canManage && (
                          <select
                            value={capa.status}
                            disabled={updatingId === capa.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(e, capa)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            {Object.entries(CAPA_STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <NewCapaModal
          users={users}
          services={services}
          categories={categories}
          priorityDelays={priorityDelays}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {isChoiceModalOpen && (
        <NewCapaChoiceModal
          onClose={() => setIsChoiceModalOpen(false)}
          onSelectGuided={() => {
            setIsChoiceModalOpen(false);
            setIsGuidedModalOpen(true);
          }}
          onSelectQuick={() => {
            setIsChoiceModalOpen(false);
            setIsModalOpen(true);
          }}
        />
      )}

      {isGuidedModalOpen && (
        <GuidedDiagnosticModal onClose={() => setIsGuidedModalOpen(false)} onCreated={handleGuidedCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="capa"
          endpoint="/capas/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}
    </div>
  );
}
