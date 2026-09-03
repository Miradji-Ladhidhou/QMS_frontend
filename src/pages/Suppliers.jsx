import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { CAPA_PRIORITY_LABELS } from '../lib/capaStatus.js';
import { SUPPLIER_STATUS_LABELS } from '../lib/supplierStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import SupplierStatusBadge from '../components/SupplierStatusBadge.jsx';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const SUPPLIER_SORT_OPTIONS = [
  { key: 'name', label: 'nom' },
  { key: 'category', label: 'catégorie' },
  { key: 'next_evaluation_date', label: "prochaine évaluation" },
  { key: 'criticality', label: 'criticité' },
  { key: 'status', label: 'statut' },
];

function NewSupplierModal({ services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    criticality: 'medium',
    service_id: '',
    category_id: '',
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
            categories={categories}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
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
  const canManage = isManagerRole(currentUser?.role);
  const [suppliers, setSuppliers] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportPdfError, setExportPdfError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [suppliersRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/suppliers', { params: statusFilter ? { status: statusFilter } : {} }),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'supplier' } }),
      ]);
      setSuppliers(suppliersRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
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
    (supplier, key) => supplier[key],
    'name',
    'asc'
  );

  function handleCreated(supplier) {
    setIsModalOpen(false);
    navigate(`/suppliers/${supplier.id}`);
  }

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? suppliers.filter((supplier) => scopeIds.includes(supplier.id)) : suppliers;
    const headers = ['Nom', 'Catégorie', 'Criticité', 'Statut', 'Contact', 'Prochaine évaluation'];
    const rows = source.map((supplier) => [
      supplier.name,
      supplier.category || '',
      CAPA_PRIORITY_LABELS[supplier.criticality] || supplier.criticality,
      SUPPLIER_STATUS_LABELS[supplier.status] || supplier.status,
      supplier.contact_name || '',
      formatDate(supplier.next_evaluation_date),
    ]);
    const countLabel = `${source.length} fournisseur${source.length > 1 ? 's' : ''}`;
    exportToCsv(`fournisseurs-${new Date().toISOString().slice(0, 10)}.csv`, 'Évaluation fournisseurs', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: statusFilter ? `${countLabel} · Statut : ${SUPPLIER_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
    });
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

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Évaluation fournisseurs</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={suppliers.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || suppliers.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => handleExportXlsx()}
            disabled={exportingXlsx || suppliers.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingXlsx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter Excel
          </button>
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

      {canManage && (
        <SelectAllToggle
          ids={sortedSuppliers.map((supplier) => supplier.id)}
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

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
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
      ) : (
        <div className="mt-4 space-y-3">
          {sortedSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => navigate(`/suppliers/${supplier.id}`)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
            >
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
                  {supplier.category || 'Catégorie non précisée'}
                  {supplier.next_evaluation_date ? ` · Prochaine évaluation le ${formatDate(supplier.next_evaluation_date)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CapaPriorityBadge priority={supplier.criticality} />
                <SupplierStatusBadge status={supplier.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewSupplierModal
          services={services}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="supplier"
          endpoint="/suppliers/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}
    </div>
  );
}
