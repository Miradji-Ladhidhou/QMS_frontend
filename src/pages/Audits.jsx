import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Cloud, Download, Folder, FolderPlus, List, Loader2, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { AUDIT_STATUS_LABELS, AUDIT_TYPE_LABELS } from '../lib/auditStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import AuditStatusBadge from '../components/AuditStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const AUDIT_SORT_OPTIONS = [
  { key: 'planned_date', label: 'date planifiée' },
  { key: 'title', label: 'titre' },
  { key: 'service', label: 'service' },
  { key: 'lead', label: 'auditeur' },
  { key: 'category', label: 'dossier' },
  { key: 'status', label: 'statut' },
];

function getAuditSortValue(audit, key) {
  if (key === 'service') return audit.service?.name || '';
  if (key === 'lead') return audit.lead?.full_name || '';
  if (key === 'category') return audit.category?.name || '';
  return audit[key];
}

function NewAuditModal({ users, services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    audit_type: 'process',
    scope: '',
    service_id: '',
    lead_auditor: '',
    planned_date: '',
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
        categoryId = await resolvePersonalCategoryId('audit');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      audit_type: form.audit_type,
      scope: form.scope || undefined,
      service_id: form.service_id || undefined,
      lead_auditor: form.lead_auditor || undefined,
      planned_date: form.planned_date,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence —
    // un bug dans le parent ne doit jamais se faire passer pour un échec de la création.
    let data;
    try {
      ({ data } = await api.post('/audits', payload));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer l'audit.");
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
          <h2 className="text-lg font-semibold text-slate-900">Nouvel audit</h2>
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
              placeholder="Ex : Audit process production — ligne 2"
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
              placeholder="Ce que couvre l'audit : processus, exigences, documents de référence..."
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
            {submitting ? 'Création...' : "Planifier l'audit"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page Audits, sans passer par
// Paramètres > Catégories — juste nom + couleur, même modale que Capas.jsx (voir
// NewFolderModal là-bas), adaptée à POST /module-categories (resource_type: 'audit').
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
      ({ data } = await api.post('/module-categories', { resource_type: 'audit', name, color }));
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
                placeholder="Ex : Audits internes, Audits fournisseurs..."
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

export default function Audits() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [audits, setAudits] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
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

  async function handleCategoryChange(event, audit) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(audit.id);
    try {
      const { data } = await api.patch(`/audits/${audit.id}`, { category_id: categoryId });
      setAudits((prev) => prev.map((item) => (item.id === audit.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cet audit.');
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
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} audit(s) sélectionné(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/audits/bulk', { data: { ids: selectedIds } });
      setAudits((prev) => prev.filter((audit) => !selectedIds.includes(audit.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces audits.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [auditsRes, usersRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/audits', { params: statusFilter ? { status: statusFilter } : {} }),
        api.get('/users'),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'audit' } }),
      ]);
      setAudits(auditsRes.data);
      setUsers(usersRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les audits.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const { sorted: sortedAudits, sortKey, direction, setSortKey, toggleSort } = useSort(
    audits,
    getAuditSortValue,
    'planned_date',
    'desc'
  );

  // Un dossier par catégorie (module_categories, resource_type='audit'), plus un dossier "Sans
  // dossier" en dernier pour les audits non classés — jamais affiché s'il est vide. Reprend
  // sortedAudits (déjà trié) pour que le mode dossier reste cohérent avec le mode liste, même
  // principe que Capas.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const audit of sortedAudits) {
      if (audit.category_id && byCategory.has(audit.category_id)) byCategory.get(audit.category_id).push(audit);
      else unfiled.push(audit);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, audits: byCategory.get(category.id) || [] }))
      .filter((group) => group.audits.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, audits: unfiled });
    return groups;
  }, [sortedAudits, categories]);

  const isFolderView = viewMode === 'folder';
  const auditGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, audits: sortedAudits }];

  function handleCreated(audit) {
    setIsModalOpen(false);
    navigate(`/audits/${audit.id}`);
  }

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? audits.filter((audit) => scopeIds.includes(audit.id)) : audits;
    const headers = ['Titre', 'Type', 'Statut', 'Service', 'Auditeur', 'Date planifiée', 'Date réalisée'];
    const rows = source.map((audit) => [
      audit.title,
      AUDIT_TYPE_LABELS[audit.audit_type] || audit.audit_type,
      AUDIT_STATUS_LABELS[audit.status] || audit.status,
      audit.service?.name || '',
      audit.lead?.full_name || '',
      formatDate(audit.planned_date),
      formatDate(audit.completed_date),
    ]);
    const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
    exportToCsv(`audits-${new Date().toISOString().slice(0, 10)}.csv`, 'Audits internes', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: statusFilter ? `${countLabel} · Statut : ${AUDIT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
    });
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? audits.filter((audit) => scopeIds.includes(audit.id)) : audits;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre', width: 0.32 },
        { key: 'type', label: 'Type', width: 0.16 },
        { key: 'status', label: 'Statut', width: 0.14 },
        { key: 'service', label: 'Service', width: 0.16 },
        { key: 'auditor', label: 'Auditeur', width: 0.1 },
        { key: 'planned_date', label: 'Date', width: 0.12 },
      ];
      const rows = source.map((audit) => ({
        title: audit.title,
        type: AUDIT_TYPE_LABELS[audit.audit_type] || audit.audit_type,
        status: AUDIT_STATUS_LABELS[audit.status] || audit.status,
        service: audit.service?.name || '',
        auditor: audit.lead?.full_name || '',
        planned_date: formatDate(audit.planned_date),
      }));
      const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
      await exportToPdf(`audits-${new Date().toISOString().slice(0, 10)}.pdf`, 'Audits internes', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${AUDIT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? audits.filter((audit) => scopeIds.includes(audit.id)) : audits;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Statut' },
        { key: 'service', label: 'Service' },
        { key: 'auditor', label: 'Auditeur' },
        { key: 'planned_date', label: 'Date' },
      ];
      const rows = source.map((audit) => ({
        title: audit.title,
        type: AUDIT_TYPE_LABELS[audit.audit_type] || audit.audit_type,
        status: AUDIT_STATUS_LABELS[audit.status] || audit.status,
        service: audit.service?.name || '',
        auditor: audit.lead?.full_name || '',
        planned_date: formatDate(audit.planned_date),
      }));
      const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
      await exportToXlsx(`audits-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Audits internes', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${AUDIT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? audits.filter((audit) => scopeIds.includes(audit.id)) : audits;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Statut' },
        { key: 'service', label: 'Service' },
        { key: 'auditor', label: 'Auditeur' },
        { key: 'planned_date', label: 'Date' },
      ];
      const rows = source.map((audit) => ({
        title: audit.title,
        type: AUDIT_TYPE_LABELS[audit.audit_type] || audit.audit_type,
        status: AUDIT_STATUS_LABELS[audit.status] || audit.status,
        service: audit.service?.name || '',
        auditor: audit.lead?.full_name || '',
        planned_date: formatDate(audit.planned_date),
      }));
      const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
      await exportToDrive('AUDIT', 'Audits internes', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${AUDIT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
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
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Audits internes</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={audits.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || audits.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => handleExportXlsx()}
            disabled={exportingXlsx || audits.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingXlsx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter Excel
          </button>
          {tenant?.storage_provider === 'google_drive' && (
            <button
              type="button"
              onClick={() => handleExportDrive()}
              disabled={exportingDrive || audits.length === 0}
              className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingDrive ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
              Enregistrer sur Drive
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Nouvel audit
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(AUDIT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={AUDIT_SORT_OPTIONS}
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

      {canManage && (
        <SelectAllToggle ids={sortedAudits.map((audit) => audit.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
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
      ) : audits.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucun audit pour l'instant</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Planifier un audit
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {auditGroups.map((group) => (
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
                  <span className="font-normal text-slate-400">({group.audits.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.audits.map((audit) => (
                    <div
                      key={audit.id}
                      onClick={() => navigate(`/audits/${audit.id}`)}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                    >
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(audit.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(audit.id)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{audit.title}</p>
                        <p className="text-sm text-slate-500">
                          {AUDIT_TYPE_LABELS[audit.audit_type]} · {formatDate(audit.planned_date)}
                          {audit.service ? ` · ${audit.service.name}` : ''}
                          {audit.lead ? ` · ${audit.lead.full_name}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <CategoryBadge category={audit.category} />
                          {canManage && (
                            <select
                              value={audit.category_id || ''}
                              disabled={updatingCategoryId === audit.id}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleCategoryChange(e, audit)}
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
                      <AuditStatusBadge status={audit.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewAuditModal
          users={users}
          services={services}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="audit"
          endpoint="/audits/bulk-category"
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
