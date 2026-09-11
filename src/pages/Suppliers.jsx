import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderCog, FolderInput, FolderPlus, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { SUPPLIER_STATUS_LABELS } from '../lib/supplierStatus.js';
import { exportTableCsv, exportToPdf, exportToXlsx, exportToWord, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import SupplierStatusBadge from '../components/SupplierStatusBadge.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import FolderTile from '../components/FolderTile.jsx';
import FolderBreadcrumb from '../components/FolderBreadcrumb.jsx';
import FolderPickerModal from '../components/FolderPickerModal.jsx';
import NewFolderModal from '../components/NewFolderModal.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import PageGuide from '../components/PageGuide.jsx';

const CATEGORIES_BASE_URL = '/module-categories';
const SUPPLIER_RESOURCE_TYPE = 'supplier';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const SUPPLIER_SORT_OPTIONS = [
  { key: 'name', label: 'nom' },
  { key: 'category', label: 'dossier' },
  { key: 'next_evaluation_date', label: "prochaine évaluation" },
  { key: 'criticality', label: 'criticité' },
  { key: 'status', label: 'statut' },
];

function getSupplierSortValue(supplier, key) {
  switch (key) {
    case 'category':
      return supplier.folder?.name || '';
    default:
      return supplier[key];
  }
}

function NewSupplierModal({ services, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    criticality: 'medium',
    service_id: '',
    category_id: '',
    category_name: '',
    next_evaluation_date: '',
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
        categoryId = await resolvePersonalCategoryId('supplier');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      name: form.name,
      category: form.category || undefined,
      contact_name: form.contact_name || undefined,
      contact_email: form.contact_email || undefined,
      contact_phone: form.contact_phone || undefined,
      criticality: form.criticality,
      service_id: form.service_id || undefined,
      category_id: categoryId,
      next_evaluation_date: form.next_evaluation_date || undefined,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence —
    // un bug dans le parent ne doit jamais se faire passer pour un échec de la création.
    let data;
    try {
      ({ data } = await api.post('/suppliers', payload));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le fournisseur.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouveau fournisseur</h2>
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
                placeholder="Ex : Matières premières"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={SUPPLIER_RESOURCE_TYPE}
            categoryName={form.category_name}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            onCategoryNameChange={(value) => updateField('category_name', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine évaluation</label>
            <input
              type="date"
              value={form.next_evaluation_date}
              onChange={(e) => updateField('next_evaluation_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function Suppliers() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [suppliers, setSuppliers] = useState([]);
  const [services, setServices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
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
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingSupplier, setMovingSupplier] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: SUPPLIER_RESOURCE_TYPE });

  async function handleMoveSupplier(folderId) {
    const supplier = movingSupplier;
    setMovingSupplier(null);
    try {
      const { data } = await api.patch(`/suppliers/${supplier.id}`, { category_id: folderId || null });
      setSuppliers((prev) => prev.map((item) => (item.id === supplier.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de ce fournisseur.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [suppliersRes, servicesRes] = await Promise.all([
        api.get('/suppliers', { params: statusFilter ? { status: statusFilter } : {} }),
        api.get('/services'),
      ]);
      setSuppliers(suppliersRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
    } catch {
      setError('Impossible de charger les fournisseurs.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (
      !window.confirm(`Supprimer définitivement ${selectedIds.length} fournisseur(s) sélectionné(s) ? Cette action est irréversible.`)
    ) {
      return;
    }
    try {
      await api.delete('/suppliers/bulk', { data: { ids: selectedIds } });
      setSuppliers((prev) => prev.filter((supplier) => !selectedIds.includes(supplier.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces fournisseurs.');
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const { sorted: sortedSuppliers, sortKey, direction, setSortKey, toggleSort } = useSort(
    suppliers,
    getSupplierSortValue,
    'name',
    'asc'
  );

  // sortedSuppliers reste la liste COMPLÈTE (filtrée seulement par statut) : naviguer dans un
  // dossier ne fait que choisir, côté affichage, quel sous-ensemble montrer — filtrage client
  // de la liste déjà chargée, même principe que Risks.jsx. "Sans dossier" (racine) =
  // category_id null.
  const currentFolderSuppliers = useMemo(
    () => sortedSuppliers.filter((supplier) => (supplier.category_id || null) === currentFolderId),
    [sortedSuppliers, currentFolderId]
  );

  function handleCreated(supplier) {
    setIsModalOpen(false);
    navigate(`/suppliers/${supplier.id}`);
  }

  async function handleExportCsv(scopeIds) {
    const source = scopeIds ? suppliers.filter((supplier) => scopeIds.includes(supplier.id)) : suppliers;
    setExportingCsv(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'name', label: 'Nom' },
        { key: 'category', label: 'Catégorie' },
        { key: 'criticality', label: 'Criticité' },
        { key: 'status', label: 'Statut' },
        { key: 'contact', label: 'Contact' },
        { key: 'next_evaluation_date', label: 'Prochaine éval.' },
      ];
      const rows = source.map((supplier) => ({
        name: supplier.name,
        category: supplier.category || '',
        criticality: CAPA_PRIORITY_LABELS[supplier.criticality] || supplier.criticality,
        status: SUPPLIER_STATUS_LABELS[supplier.status] || supplier.status,
        contact: supplier.contact_name || '',
        next_evaluation_date: formatDate(supplier.next_evaluation_date),
      }));
      const countLabel = `${source.length} fournisseur${source.length > 1 ? 's' : ''}`;
      await exportTableCsv(`fournisseurs-${new Date().toISOString().slice(0, 10)}.csv`, 'Évaluation fournisseurs', columns, rows, {
        generatedBy: currentUser?.full_name,
        subtitle: statusFilter ? `${countLabel} · Statut : ${SUPPLIER_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
      });
    } catch {
      setExportPdfError('Impossible de générer le CSV.');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? suppliers.filter((supplier) => scopeIds.includes(supplier.id)) : suppliers;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'name', label: 'Nom', width: 0.24 },
        { key: 'category', label: 'Catégorie', width: 0.2 },
        { key: 'criticality', label: 'Criticité', width: 0.14 },
        { key: 'status', label: 'Statut', width: 0.14 },
        { key: 'contact', label: 'Contact', width: 0.14 },
        { key: 'next_evaluation_date', label: 'Prochaine éval.', width: 0.14 },
      ];
      const rows = source.map((supplier) => ({
        name: supplier.name,
        category: supplier.category || '',
        criticality: CAPA_PRIORITY_LABELS[supplier.criticality] || supplier.criticality,
        status: SUPPLIER_STATUS_LABELS[supplier.status] || supplier.status,
        contact: supplier.contact_name || '',
        next_evaluation_date: formatDate(supplier.next_evaluation_date),
      }));
      const countLabel = `${source.length} fournisseur${source.length > 1 ? 's' : ''}`;
      await exportToPdf(`fournisseurs-${new Date().toISOString().slice(0, 10)}.pdf`, 'Évaluation fournisseurs', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${SUPPLIER_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? suppliers.filter((supplier) => scopeIds.includes(supplier.id)) : suppliers;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'name', label: 'Nom' },
        { key: 'category', label: 'Catégorie' },
        { key: 'criticality', label: 'Criticité' },
        { key: 'status', label: 'Statut' },
        { key: 'contact', label: 'Contact' },
        { key: 'next_evaluation_date', label: 'Prochaine éval.' },
      ];
      const rows = source.map((supplier) => ({
        name: supplier.name,
        category: supplier.category || '',
        criticality: CAPA_PRIORITY_LABELS[supplier.criticality] || supplier.criticality,
        status: SUPPLIER_STATUS_LABELS[supplier.status] || supplier.status,
        contact: supplier.contact_name || '',
        next_evaluation_date: formatDate(supplier.next_evaluation_date),
      }));
      const countLabel = `${source.length} fournisseur${source.length > 1 ? 's' : ''}`;
      await exportToXlsx(`fournisseurs-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Évaluation fournisseurs', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${SUPPLIER_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? suppliers.filter((supplier) => scopeIds.includes(supplier.id)) : suppliers;
    setExportingWord(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'name', label: 'Nom' },
        { key: 'category', label: 'Catégorie' },
        { key: 'criticality', label: 'Criticité' },
        { key: 'status', label: 'Statut' },
        { key: 'contact', label: 'Contact' },
        { key: 'next_evaluation_date', label: 'Prochaine éval.' },
      ];
      const rows = source.map((supplier) => ({
        name: supplier.name,
        category: supplier.category || '',
        criticality: CAPA_PRIORITY_LABELS[supplier.criticality] || supplier.criticality,
        status: SUPPLIER_STATUS_LABELS[supplier.status] || supplier.status,
        contact: supplier.contact_name || '',
        next_evaluation_date: formatDate(supplier.next_evaluation_date),
      }));
      const countLabel = `${source.length} fournisseur${source.length > 1 ? 's' : ''}`;
      await exportToWord(`fournisseurs-${new Date().toISOString().slice(0, 10)}.docx`, 'Évaluation fournisseurs', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${SUPPLIER_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le fichier Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? suppliers.filter((supplier) => scopeIds.includes(supplier.id)) : suppliers;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'name', label: 'Nom' },
        { key: 'category', label: 'Catégorie' },
        { key: 'criticality', label: 'Criticité' },
        { key: 'status', label: 'Statut' },
        { key: 'contact', label: 'Contact' },
        { key: 'next_evaluation_date', label: 'Prochaine éval.' },
      ];
      const rows = source.map((supplier) => ({
        name: supplier.name,
        category: supplier.category || '',
        criticality: CAPA_PRIORITY_LABELS[supplier.criticality] || supplier.criticality,
        status: SUPPLIER_STATUS_LABELS[supplier.status] || supplier.status,
        contact: supplier.contact_name || '',
        next_evaluation_date: formatDate(supplier.next_evaluation_date),
      }));
      const countLabel = `${source.length} fournisseur${source.length > 1 ? 's' : ''}`;
      await exportToDrive('FOURN', 'Évaluation fournisseurs', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${SUPPLIER_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
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
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Évaluation fournisseurs</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportMenu
            disabled={suppliers.length === 0}
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
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Nouveau fournisseur
            </button>
          )}
        </div>
      </div>
      <PageGuide id="suppliers" />

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(SUPPLIER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={SUPPLIER_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Tous les fournisseurs" />

        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setIsManageCategoriesOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderCog size={16} />
            Gérer les dossiers
          </button>
        )}
      </div>

      {canManage && (
        <SelectAllToggle
          ids={currentFolderSuppliers.map((supplier) => supplier.id)}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
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

      {loading || foldersLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          {(folders.length > 0 || currentUser?.role === 'admin') && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {folders.map((folder) => (
                <FolderTile key={folder.id} folder={folder} canManage={false} onOpen={() => navigateToFolder(folder.id)} />
              ))}
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <FolderPlus size={26} />
                  <span className="text-sm font-medium">Nouveau dossier</span>
                </button>
              )}
            </div>
          )}

          {suppliers.length === 0 && folders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
              <p className="text-base font-medium text-slate-700">Aucun fournisseur pour l'instant</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                >
                  <Plus size={18} />
                  Créer le premier fournisseur
                </button>
              )}
            </div>
          ) : currentFolderSuppliers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucun fournisseur directement dans ce dossier.' : 'Aucun fournisseur sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {currentFolderSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  onClick={() => navigate(`/suppliers/${supplier.id}`)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {canManage && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(supplier.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleSelect(supplier.id)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{supplier.name}</p>
                        <p className="truncate text-sm text-slate-500">
                          {supplier.next_evaluation_date
                            ? `Prochaine évaluation le ${formatDate(supplier.next_evaluation_date)}`
                            : 'Aucune évaluation planifiée'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <CapaPriorityBadge priority={supplier.criticality} />
                      <SupplierStatusBadge status={supplier.status} />
                    </div>
                  </div>
                  {canManage && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingSupplier(supplier);
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <FolderInput size={12} />
                        Déplacer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <NewSupplierModal
          services={services}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={SUPPLIER_RESOURCE_TYPE}
          endpoint="/suppliers/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={SUPPLIER_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={SUPPLIER_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingSupplier && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={SUPPLIER_RESOURCE_TYPE}
          initialFolderId={movingSupplier.category_id || null}
          title="Déplacer"
          subtitle={movingSupplier.name}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingSupplier(null)}
          onSelect={handleMoveSupplier}
        />
      )}
    </div>
  );
}
