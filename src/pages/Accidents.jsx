import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Folder, FolderPlus, HeartPulse, List, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { ACCIDENT_STATUS_LABELS, ACCIDENT_SEVERITY_LABELS } from '../lib/accidentStatus.js';
import { exportTableCsv, exportToPdf, exportToXlsx, exportToWord, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import AccidentStatusBadge from '../components/AccidentStatusBadge.jsx';
import AccidentSeverityBadge from '../components/AccidentSeverityBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import ExportMenu from '../components/ExportMenu.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Une seule personne "concernée" par l'accident, avec ou sans compte utilisateur — même
// double identité que tasks.assigned_to/assigned_employee_id (voir Trainings.jsx pour le même
// besoin de combiner comptes et personnel sans compte dans un unique sélecteur).
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

function injuredPersonName(accident) {
  return accident.injured_user?.full_name || accident.injured_employee?.full_name || null;
}

const SEVERITY_ORDER = { minor: 1, moderate: 2, severe: 3, fatal: 4 };

const ACCIDENT_SORT_OPTIONS = [
  { key: 'occurred_at', label: "date de l'accident" },
  { key: 'title', label: 'titre' },
  { key: 'severity', label: 'gravité' },
];

function getAccidentSortValue(accident, key) {
  if (key === 'severity') return SEVERITY_ORDER[accident.severity] ?? 0;
  return accident[key];
}

// Admin uniquement pour la suppression individuelle, sinon le créateur (voir DELETE
// /accidents/:id côté backend) — contrairement à l'édition/investigation qui reste ouverte à
// tout manager, la suppression n'inclut pas un manager qui n'a pas déclaré l'accident lui-même.
function canDeleteAccident(accident, currentUser) {
  if (!accident || !currentUser) return false;
  return currentUser.role === 'admin' || accident.created_by === currentUser.id;
}

function PersonField({ users, employees, value, onChange }) {
  const people = combinePeople(users, employees);
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Personne concernée</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      >
        <option value="">Non renseignée</option>
        {people.map((person) => (
          <option key={personKey(person.kind, person.id)} value={personKey(person.kind, person.id)}>
            {person.full_name} ({PERSON_KIND_LABEL[person.kind]})
          </option>
        ))}
      </select>
    </div>
  );
}

// Modale de création — ouverte à tous les rôles côté backend (POST /accidents), contrairement
// à la plupart des autres registres SMQ : déclarer un accident du travail doit rester simple
// pour quiconque en est témoin.
function NewAccidentModal({ users, employees, services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    occurred_at: new Date().toISOString().slice(0, 10),
    location: '',
    person: '',
    service_id: '',
    description: '',
    immediate_cause: '',
    immediate_actions: '',
    severity: 'minor',
    with_lost_time: false,
    lost_days: '',
    category_id: '',
  });
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || undefined;
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

    const payload = {
      title: form.title,
      occurred_at: form.occurred_at,
      location: form.location || undefined,
      injured_user_id: personKind === 'user' ? personId : undefined,
      injured_employee_id: personKind === 'employee' ? personId : undefined,
      service_id: form.service_id || undefined,
      description: form.description || undefined,
      immediate_cause: form.immediate_cause || undefined,
      immediate_actions: form.immediate_actions || undefined,
      severity: form.severity,
      with_lost_time: form.with_lost_time,
      lost_days: form.with_lost_time && form.lost_days ? Number(form.lost_days) : undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/accidents', payload);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de déclarer cet accident.");
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
          <h2 className="text-lg font-semibold text-slate-900">Déclarer un accident du travail</h2>
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
              placeholder="Ex : Chute de plain-pied en zone de stockage"
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

          <PersonField users={users} employees={employees} value={form.person} onChange={(value) => updateField('person', value)} />

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
            {submitting ? 'Déclaration...' : "Déclarer l'accident"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page, sans passer par
// Paramètres > Catégories — même modale que Risks.jsx/Capas.jsx, adaptée à
// POST /module-categories (resource_type: 'accident').
function NewFolderModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1F3864');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let data;
    try {
      ({ data } = await api.post('/module-categories', { resource_type: 'accident', name, color }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer ce dossier.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouveau dossier</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex : Accidents entrepôt, Accidents 2026..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Couleur</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-16 rounded-md border border-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer le dossier'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Accidents() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [accidents, setAccidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [lostTimeFilter, setLostTimeFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleFolder(key) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleFolderCreated(category) {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    setIsNewFolderModalOpen(false);
    setExpandedFolders((prev) => new Set(prev).add(category.id));
  }

  async function handleCategoryChange(event, accident) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(accident.id);
    try {
      const { data } = await api.patch(`/accidents/${accident.id}`, { category_id: categoryId });
      setAccidents((prev) => prev.map((item) => (item.id === accident.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cet accident.');
    } finally {
      setUpdatingCategoryId(null);
    }
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} accident(s) sélectionné(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/accidents/bulk', { data: { ids: selectedIds } });
      setSelectedIds([]);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces accidents.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (serviceFilter) params.service_id = serviceFilter;
      if (lostTimeFilter) params.with_lost_time = 'true';
      const [accidentsRes, usersRes, employeesRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/accidents', { params }),
        api.get('/users'),
        api.get('/employees'),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'accident' } }),
      ]);
      setAccidents(accidentsRes.data);
      setUsers(usersRes.data);
      setEmployees(employeesRes.data.filter((employee) => employee.is_active));
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError("Impossible de charger le registre des accidents du travail.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, serviceFilter, lostTimeFilter]);

  const { sorted: sortedAccidents, sortKey, direction, setSortKey, toggleSort } = useSort(
    accidents,
    getAccidentSortValue,
    'occurred_at',
    'desc'
  );

  // Un dossier par catégorie (module_categories, resource_type='accident'), plus un dossier
  // "Sans dossier" en dernier pour les accidents non classés — jamais affiché s'il est vide.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const accident of sortedAccidents) {
      if (accident.category_id && byCategory.has(accident.category_id)) byCategory.get(accident.category_id).push(accident);
      else unfiled.push(accident);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, accidents: byCategory.get(category.id) || [] }))
      .filter((group) => group.accidents.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, accidents: unfiled });
    return groups;
  }, [sortedAccidents, categories]);

  const isFolderView = viewMode === 'folder';
  const accidentGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, accidents: sortedAccidents }];

  const deletableIds = sortedAccidents.filter((accident) => canDeleteAccident(accident, currentUser)).map((accident) => accident.id);

  function handleCreated(accident) {
    setIsModalOpen(false);
    navigate(`/accidents/${accident.id}`);
  }

  function accidentSubtitle(accident) {
    const parts = [formatDate(accident.occurred_at)];
    const person = injuredPersonName(accident);
    if (person) parts.push(person);
    if (accident.service?.name) parts.push(accident.service.name);
    return parts.join(' · ');
  }

  function buildExportRows(source) {
    return source.map((accident) => ({
      title: accident.title,
      occurred_at: formatDate(accident.occurred_at),
      severity: ACCIDENT_SEVERITY_LABELS[accident.severity] || accident.severity,
      status: ACCIDENT_STATUS_LABELS[accident.status] || accident.status,
      person: injuredPersonName(accident) || '',
      service: accident.service?.name || '',
      with_lost_time: accident.with_lost_time ? `Oui (${accident.lost_days ?? '—'} j)` : 'Non',
    }));
  }

  function filterSummary() {
    const parts = [];
    if (severityFilter) parts.push(`Gravité : ${ACCIDENT_SEVERITY_LABELS[severityFilter] || severityFilter}`);
    if (statusFilter) parts.push(`Statut : ${ACCIDENT_STATUS_LABELS[statusFilter] || statusFilter}`);
    if (serviceFilter) parts.push(`Service : ${services.find((s) => s.id === serviceFilter)?.name || serviceFilter}`);
    if (lostTimeFilter) parts.push('Avec arrêt de travail');
    return parts;
  }

  async function handleExportCsv(scopeIds) {
    const source = scopeIds ? accidents.filter((accident) => scopeIds.includes(accident.id)) : accidents;
    setExportingCsv(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'occurred_at', label: "Date de l'accident" },
        { key: 'severity', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'person', label: 'Personne concernée' },
        { key: 'service', label: 'Service' },
        { key: 'with_lost_time', label: 'Arrêt de travail' },
      ];
      const countLabel = `${source.length} accident${source.length > 1 ? 's' : ''}`;
      await exportTableCsv(`accidents-${new Date().toISOString().slice(0, 10)}.csv`, 'Registre des accidents du travail', columns, buildExportRows(source), {
        generatedBy: currentUser?.full_name,
        subtitle: [countLabel, ...filterSummary()].join(' · '),
      });
    } catch {
      setExportPdfError('Impossible de générer le CSV.');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? accidents.filter((accident) => scopeIds.includes(accident.id)) : accidents;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre', width: 0.26 },
        { key: 'occurred_at', label: 'Date', width: 0.12 },
        { key: 'severity', label: 'Gravité', width: 0.14 },
        { key: 'status', label: 'Statut', width: 0.14 },
        { key: 'person', label: 'Personne', width: 0.16 },
        { key: 'service', label: 'Service', width: 0.18 },
      ];
      const countLabel = `${source.length} accident${source.length > 1 ? 's' : ''}`;
      await exportToPdf(`accidents-${new Date().toISOString().slice(0, 10)}.pdf`, 'Registre des accidents du travail', columns, buildExportRows(source), {
        subtitle: [countLabel, ...filterSummary()].join(' · '),
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? accidents.filter((accident) => scopeIds.includes(accident.id)) : accidents;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'occurred_at', label: 'Date' },
        { key: 'severity', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'person', label: 'Personne' },
        { key: 'service', label: 'Service' },
      ];
      const countLabel = `${source.length} accident${source.length > 1 ? 's' : ''}`;
      await exportToXlsx(`accidents-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Registre des accidents du travail', columns, buildExportRows(source), {
        subtitle: [countLabel, ...filterSummary()].join(' · '),
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? accidents.filter((accident) => scopeIds.includes(accident.id)) : accidents;
    setExportingWord(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'occurred_at', label: 'Date' },
        { key: 'severity', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'person', label: 'Personne' },
        { key: 'service', label: 'Service' },
      ];
      const countLabel = `${source.length} accident${source.length > 1 ? 's' : ''}`;
      await exportToWord(`accidents-${new Date().toISOString().slice(0, 10)}.docx`, 'Registre des accidents du travail', columns, buildExportRows(source), {
        subtitle: [countLabel, ...filterSummary()].join(' · '),
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? accidents.filter((accident) => scopeIds.includes(accident.id)) : accidents;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'occurred_at', label: 'Date' },
        { key: 'severity', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'person', label: 'Personne' },
        { key: 'service', label: 'Service' },
      ];
      const countLabel = `${source.length} accident${source.length > 1 ? 's' : ''}`;
      await exportToDrive('ACCIDENT', 'Registre des accidents du travail', columns, buildExportRows(source), {
        subtitle: [countLabel, ...filterSummary()].join(' · '),
        generatedBy: currentUser?.full_name,
      });
      setDriveSuccess('Enregistré sur le Drive partagé.');
    } catch (err) {
      setExportPdfError(err.response?.data?.error || "Impossible d'enregistrer sur le Drive.");
    } finally {
      setExportingDrive(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Accidents du travail</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportMenu
            disabled={accidents.length === 0}
            onExportCsv={() => handleExportCsv()}
            exportingCsv={exportingCsv}
            onExportPdf={() => handleExportPdf()}
            exportingPdf={exportingPdf}
            onExportXlsx={() => handleExportXlsx()}
            exportingXlsx={exportingXlsx}
            onExportWord={() => handleExportWord()}
            exportingWord={exportingWord}
            onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive() : undefined}
            exportingDrive={exportingDrive}
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Déclarer un accident
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Toutes gravités</option>
          {Object.entries(ACCIDENT_SEVERITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(ACCIDENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les services</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setLostTimeFilter((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            lostTimeFilter ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HeartPulse size={16} />
          Avec arrêt de travail
        </button>

        <SortSelect
          options={ACCIDENT_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('folder')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'folder' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Folder size={16} />
            Par dossier
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={16} />
            Liste
          </button>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderPlus size={16} />
            Nouveau dossier
          </button>
        )}
      </div>

      {/* Sélectionnable dès qu'au moins un accident est supprimable par l'utilisateur courant —
          un admin voit tous les accidents, les autres rôles uniquement ceux qu'ils ont déclarés
          (même règle que DELETE /accidents/bulk côté backend, voir canDeleteAccident). */}
      <SelectAllToggle ids={deletableIds} selectedIds={selectedIds} onChange={setSelectedIds} />

      <BulkSelectionBar
        count={selectedIds.length}
        onMove={canManage ? () => setIsBulkMoveModalOpen(true) : undefined}
        onExportCsv={() => handleExportCsv(selectedIds)}
        exportingCsv={exportingCsv}
        onExportPdf={() => handleExportPdf(selectedIds)}
        exportingPdf={exportingPdf}
        onExportXlsx={() => handleExportXlsx(selectedIds)}
        exportingXlsx={exportingXlsx}
        onExportWord={() => handleExportWord(selectedIds)}
        exportingWord={exportingWord}
        onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive(selectedIds) : undefined}
        exportingDrive={exportingDrive}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds([])}
      />

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : accidents.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucun accident du travail enregistré pour l'instant</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Déclarer le premier accident
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {accidentGroups.map((group) => (
            <div key={group.key}>
              {isFolderView && (
                <button
                  type="button"
                  onClick={() => toggleFolder(group.key)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700"
                >
                  {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                  {group.category ? group.category.name : 'Sans dossier'}
                  <span className="font-normal text-slate-400">({group.accidents.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.accidents.map((accident) => (
                    <div
                      key={accident.id}
                      onClick={() => navigate(`/accidents/${accident.id}`)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {canDeleteAccident(accident, currentUser) && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(accident.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelect(accident.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{accident.title}</p>
                          <p className="truncate text-sm text-slate-500">{accidentSubtitle(accident)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <AccidentSeverityBadge severity={accident.severity} />
                          <AccidentStatusBadge status={accident.status} />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={accident.category} />
                        {accident.with_lost_time && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            Arrêt de travail{accident.lost_days ? ` — ${accident.lost_days} j` : ''}
                          </span>
                        )}
                        {canManage && (
                          <select
                            value={accident.category_id || ''}
                            disabled={updatingCategoryId === accident.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCategoryChange(e, accident)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Sans dossier</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewAccidentModal
          users={users}
          employees={employees}
          services={services}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="accident"
          endpoint="/accidents/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isNewFolderModalOpen && (
        <NewFolderModal onClose={() => setIsNewFolderModalOpen(false)} onCreated={handleFolderCreated} />
      )}
    </div>
  );
}
