import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Download, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { CAPA_EFFECTIVENESS_LABELS, CAPA_PRIORITY_LABELS, CAPA_STATUS_LABELS } from '../lib/capaStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf } from '../lib/pdfExport.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import AiCapaSuggestion from '../components/AiCapaSuggestion.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import CapaStatusBadge from '../components/CapaStatusBadge.jsx';

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

    try {
      const { data } = await api.post('/qqoqccp/quick-start', { title });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de démarrer le diagnostic.');
    } finally {
      setSubmitting(false);
    }
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

function NewCapaModal({ users, services, priorityDelays, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    service_id: '',
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
        description: form.description || undefined,
        priority: form.priority,
        origin: form.origin || undefined,
        due_date: form.due_date || undefined,
        assigned_to: form.assigned_to || undefined,
        root_cause: form.root_cause || undefined,
        corrective_action: form.corrective_action || undefined,
        preventive_action: form.preventive_action || undefined,
      };
      const { data } = await api.post('/capas', payload);
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
              <p className="mt-1 text-xs text-slate-400">
                Aucun service configuré — un administrateur peut en créer depuis les paramètres.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description de la non-conformité</label>
            <textarea
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cause identifiée</label>
            <textarea
              rows={2}
              value={form.root_cause}
              onChange={(e) => updateField('root_cause', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective</label>
            <textarea
              rows={2}
              value={form.corrective_action}
              onChange={(e) => updateField('corrective_action', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action préventive</label>
            <textarea
              rows={2}
              value={form.preventive_action}
              onChange={(e) => updateField('preventive_action', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

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
                  (délai de traitement suggéré : {getDelayDays(form.priority, priorityDelays) ?? '—'} jours)
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
  const canManage = isManagerRole(currentUser?.role);
  const [capas, setCapas] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [priorityDelays, setPriorityDelays] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [capasRes, usersRes, delaysRes, servicesRes] = await Promise.all([
        api.get('/capas'),
        api.get('/users'),
        api.get('/capas/priority-delays'),
        api.get('/services'),
      ]);
      setCapas(capasRes.data);
      setUsers(usersRes.data);
      setPriorityDelays(delaysRes.data);
      // GET /services renvoie aussi les services désactivés (nécessaire à la page de
      // gestion) — un formulaire de création ne doit proposer que les actifs.
      setServices(servicesRes.data.filter((service) => service.is_active));
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
      closed: capas.filter((capa) => capa.status === 'closed').length,
    }),
    [capas]
  );

  function handleExportCsv() {
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
    const rows = capas.map((capa) => [
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

    exportToCsv(`capa-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  async function handleExportPdf() {
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
      const rows = capas.map((capa) => ({
        number: capa.number,
        title: capa.title,
        priority: CAPA_PRIORITY_LABELS[capa.priority] || capa.priority,
        status: CAPA_STATUS_LABELS[capa.status] || capa.status,
        due_date: formatDate(capa.due_date),
        assigned: capa.assigned?.full_name || '',
      }));
      await exportToPdf(`capa-${new Date().toISOString().slice(0, 10)}.pdf`, 'CAPA', columns, rows, {
        subtitle: `${capas.length} CAPA`,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={capas.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || capas.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
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

      <div className="mt-4 grid grid-cols-3 gap-3">
        <CounterCard label="Ouvertes" value={counters.open} accent="text-blue-700" />
        <CounterCard label="En cours" value={counters.in_progress} accent="text-amber-700" />
        <CounterCard label="Clôturées" value={counters.closed} accent="text-emerald-700" />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : capas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune CAPA pour l'instant.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {capas.map((capa) => (
              <div
                key={capa.id}
                onClick={() => navigate(`/capas/${capa.id}`)}
                className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm ${
                  capa.status === 'overdue' ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{capa.title}</p>
                    <p className="text-sm text-slate-500">
                      {capa.number} · {capa.service?.name || 'Service non précisé'}
                    </p>
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
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Objet</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Gravité</th>
                  <th className="px-4 py-3">Délai de traitement</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {capas.map((capa) => (
                  <tr
                    key={capa.id}
                    onClick={() => navigate(`/capas/${capa.id}`)}
                    className={`cursor-pointer hover:bg-slate-50 ${capa.status === 'overdue' ? 'bg-red-50/50' : ''}`}
                  >
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
    </div>
  );
}
