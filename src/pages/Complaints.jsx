import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Folder, FolderPlus, List, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { COMPLAINT_STATUS_LABELS } from '../lib/complaintStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import ComplaintStatusBadge from '../components/ComplaintStatusBadge.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
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

const COMPLAINT_SORT_OPTIONS = [
  { key: 'received_date', label: 'date de réception' },
  { key: 'customer_name', label: 'client' },
  { key: 'assigned', label: 'responsable' },
  { key: 'category', label: 'dossier' },
  { key: 'severity', label: 'gravité' },
  { key: 'status', label: 'statut' },
];

function getComplaintSortValue(complaint, key) {
  if (key === 'assigned') return complaint.assigned?.full_name || '';
  if (key === 'category') return complaint.category?.name || '';
  return complaint[key];
}

function NewComplaintModal({ users, services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_contact: '',
    received_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    description: '',
    product_service: '',
    severity: 'medium',
    service_id: '',
    category_id: '',
    assigned_to: '',
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
        categoryId = await resolvePersonalCategoryId('complaint');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      customer_name: form.customer_name,
      customer_contact: form.customer_contact || undefined,
      received_date: form.received_date,
      due_date: form.due_date || undefined,
      description: form.description,
      product_service: form.product_service || undefined,
      severity: form.severity,
      service_id: form.service_id || undefined,
      category_id: categoryId,
      assigned_to: form.assigned_to || undefined,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/complaints', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la réclamation.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle réclamation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client</label>
              <input
                type="text"
                required
                value={form.customer_name}
                onChange={(e) => updateField('customer_name', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact</label>
              <input
                type="text"
                placeholder="Email ou téléphone"
                value={form.customer_contact}
                onChange={(e) => updateField('customer_contact', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description de la réclamation</label>
            <AutoTextarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Produit / service concerné</label>
            <input
              type="text"
              value={form.product_service}
              onChange={(e) => updateField('product_service', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date de réception</label>
              <input
                type="date"
                required
                value={form.received_date}
                onChange={(e) => updateField('received_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Échéance de réponse</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
              <select
                value={form.severity}
                onChange={(e) => updateField('severity', e.target.value)}
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
            {submitting ? 'Création...' : 'Enregistrer la réclamation'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page Réclamations, sans passer par
// Paramètres > Catégories — juste nom + couleur, même modale que Capas.jsx, adaptée à
// POST /module-categories (resource_type: 'complaint').
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
      ({ data } = await api.post('/module-categories', { resource_type: 'complaint', name, color }));
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
                placeholder="Ex : Réclamations clients, Réclamations internes..."
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

export default function Complaints() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [complaints, setComplaints] = useState([]);
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

  async function handleCategoryChange(event, complaint) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(complaint.id);
    try {
      const { data } = await api.patch(`/complaints/${complaint.id}`, { category_id: categoryId });
      setComplaints((prev) => prev.map((item) => (item.id === complaint.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette réclamation.');
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
    if (
      !window.confirm(`Supprimer définitivement ${selectedIds.length} réclamation(s) sélectionnée(s) ? Cette action est irréversible.`)
    ) {
      return;
    }
    try {
      await api.delete('/complaints/bulk', { data: { ids: selectedIds } });
      setComplaints((prev) => prev.filter((complaint) => !selectedIds.includes(complaint.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces réclamations.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [complaintsRes, usersRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/complaints', { params: statusFilter ? { status: statusFilter } : {} }),
        api.get('/users'),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'complaint' } }),
      ]);
      setComplaints(complaintsRes.data);
      setUsers(usersRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les réclamations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const { sorted: sortedComplaints, sortKey, direction, setSortKey, toggleSort } = useSort(
    complaints,
    getComplaintSortValue,
    'received_date',
    'desc'
  );

  // Un dossier par catégorie (module_categories, resource_type='complaint'), plus un dossier
  // "Sans dossier" en dernier pour les réclamations non classées — jamais affiché s'il est vide.
  // Reprend sortedComplaints (déjà trié) pour que le mode dossier reste cohérent avec le mode
  // liste, même principe que Capas.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const complaint of sortedComplaints) {
      if (complaint.category_id && byCategory.has(complaint.category_id)) byCategory.get(complaint.category_id).push(complaint);
      else unfiled.push(complaint);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, complaints: byCategory.get(category.id) || [] }))
      .filter((group) => group.complaints.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, complaints: unfiled });
    return groups;
  }, [sortedComplaints, categories]);

  const isFolderView = viewMode === 'folder';
  const complaintGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, complaints: sortedComplaints }];

  function handleCreated(complaint) {
    setIsModalOpen(false);
    navigate(`/complaints/${complaint.id}`);
  }

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? complaints.filter((complaint) => scopeIds.includes(complaint.id)) : complaints;
    const headers = ['Client', 'Description', 'Gravité', 'Statut', 'Date de réception', 'Échéance de réponse', 'Assigné'];
    const rows = source.map((complaint) => [
      complaint.customer_name,
      complaint.description || '',
      CAPA_PRIORITY_LABELS[complaint.severity] || complaint.severity,
      COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status,
      formatDate(complaint.received_date),
      formatDate(complaint.due_date),
      complaint.assigned?.full_name || '',
    ]);
    const countLabel = `${source.length} réclamation${source.length > 1 ? 's' : ''}`;
    exportToCsv(`reclamations-${new Date().toISOString().slice(0, 10)}.csv`, 'Réclamations clients', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: statusFilter ? `${countLabel} · Statut : ${COMPLAINT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
    });
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? complaints.filter((complaint) => scopeIds.includes(complaint.id)) : complaints;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'customer_name', label: 'Client', width: 0.2 },
        { key: 'description', label: 'Description', width: 0.32 },
        { key: 'severity', label: 'Gravité', width: 0.12 },
        { key: 'status', label: 'Statut', width: 0.14 },
        { key: 'due_date', label: 'Échéance', width: 0.12 },
        { key: 'assigned', label: 'Assigné', width: 0.1 },
      ];
      const rows = source.map((complaint) => ({
        customer_name: complaint.customer_name,
        description: complaint.description || '',
        severity: CAPA_PRIORITY_LABELS[complaint.severity] || complaint.severity,
        status: COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status,
        due_date: formatDate(complaint.due_date),
        assigned: complaint.assigned?.full_name || '',
      }));
      const countLabel = `${source.length} réclamation${source.length > 1 ? 's' : ''}`;
      await exportToPdf(`reclamations-${new Date().toISOString().slice(0, 10)}.pdf`, 'Réclamations clients', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${COMPLAINT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? complaints.filter((complaint) => scopeIds.includes(complaint.id)) : complaints;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'customer_name', label: 'Client' },
        { key: 'description', label: 'Description' },
        { key: 'severity', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'due_date', label: 'Échéance' },
        { key: 'assigned', label: 'Assigné' },
      ];
      const rows = source.map((complaint) => ({
        customer_name: complaint.customer_name,
        description: complaint.description || '',
        severity: CAPA_PRIORITY_LABELS[complaint.severity] || complaint.severity,
        status: COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status,
        due_date: formatDate(complaint.due_date),
        assigned: complaint.assigned?.full_name || '',
      }));
      const countLabel = `${source.length} réclamation${source.length > 1 ? 's' : ''}`;
      await exportToXlsx(`reclamations-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Réclamations clients', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${COMPLAINT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? complaints.filter((complaint) => scopeIds.includes(complaint.id)) : complaints;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'customer_name', label: 'Client' },
        { key: 'description', label: 'Description' },
        { key: 'severity', label: 'Gravité' },
        { key: 'status', label: 'Statut' },
        { key: 'due_date', label: 'Échéance' },
        { key: 'assigned', label: 'Assigné' },
      ];
      const rows = source.map((complaint) => ({
        customer_name: complaint.customer_name,
        description: complaint.description || '',
        severity: CAPA_PRIORITY_LABELS[complaint.severity] || complaint.severity,
        status: COMPLAINT_STATUS_LABELS[complaint.status] || complaint.status,
        due_date: formatDate(complaint.due_date),
        assigned: complaint.assigned?.full_name || '',
      }));
      const countLabel = `${source.length} réclamation${source.length > 1 ? 's' : ''}`;
      await exportToDrive('RECLAM', 'Réclamations clients', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${COMPLAINT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
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
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Réclamations clients</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportMenu
            disabled={complaints.length === 0}
            onExportCsv={() => handleExportCsv()}
            onExportPdf={() => handleExportPdf()}
            exportingPdf={exportingPdf}
            onExportXlsx={() => handleExportXlsx()}
            exportingXlsx={exportingXlsx}
            onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive() : undefined}
            exportingDrive={exportingDrive}
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Nouvelle réclamation
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={COMPLAINT_SORT_OPTIONS}
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
        <SelectAllToggle
          ids={sortedComplaints.map((complaint) => complaint.id)}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
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
      ) : complaints.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucune réclamation pour l'instant</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Enregistrer la première réclamation
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {complaintGroups.map((group) => (
            <Fragment key={group.key}>
              {isFolderView && (
                <button
                  type="button"
                  onClick={() => toggleFolder(group.key)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700"
                >
                  {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                  {group.category ? group.category.name : 'Sans dossier'}
                  <span className="font-normal text-slate-400">({group.complaints.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.complaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      onClick={() => navigate(`/complaints/${complaint.id}`)}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                    >
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(complaint.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(complaint.id)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{complaint.customer_name}</p>
                        <p className="truncate text-sm text-slate-500">
                          {formatDate(complaint.received_date)}
                          {complaint.assigned ? ` · ${complaint.assigned.full_name}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <CategoryBadge category={complaint.category} />
                          {canManage && (
                            <select
                              value={complaint.category_id || ''}
                              disabled={updatingCategoryId === complaint.id}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleCategoryChange(e, complaint)}
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
                      <div className="flex shrink-0 items-center gap-2">
                        <CapaPriorityBadge priority={complaint.severity} />
                        <ComplaintStatusBadge status={complaint.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewComplaintModal
          users={users}
          services={services}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="complaint"
          endpoint="/complaints/bulk-category"
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
