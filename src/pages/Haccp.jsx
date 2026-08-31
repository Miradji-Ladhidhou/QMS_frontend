import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { PLAN_STATUS_LABELS } from '../lib/haccpStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import PlanStatusBadge from '../components/PlanStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

const PLAN_SORT_OPTIONS = [
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
  { key: 'created_at', label: 'date de création' },
];

function getPlanSortValue(plan, key) {
  return plan[key];
}

function NewPlanModal({ services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    product_description: '',
    scope: '',
    team: '',
    service_id: '',
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
        categoryId = await resolvePersonalCategoryId('haccp_plan');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      product_description: form.product_description || undefined,
      scope: form.scope || undefined,
      team: form.team || undefined,
      service_id: form.service_id || undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/haccp/plans', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le plan HACCP.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouveau plan HACCP</h2>
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
              placeholder="Ex : Fabrication de yaourt nature"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Produit concerné</label>
            <AutoTextarea
              rows={2}
              value={form.product_description}
              onChange={(e) => updateField('product_description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Périmètre</label>
            <AutoTextarea
              rows={2}
              value={form.scope}
              onChange={(e) => updateField('scope', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Équipe HACCP</label>
            <input
              type="text"
              placeholder="Ex : Responsable qualité, Responsable production..."
              value={form.team}
              onChange={(e) => updateField('team', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Haccp() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} plan(s) HACCP sélectionné(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/haccp/plans/bulk', { data: { ids: selectedIds } });
      setPlans((prev) => prev.filter((plan) => !selectedIds.includes(plan.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces plans.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [plansRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/haccp/plans', { params }),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'haccp_plan' } }),
      ]);
      setPlans(plansRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les plans HACCP.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const { sorted: sortedPlans, sortKey, direction, setSortKey, toggleSort } = useSort(plans, getPlanSortValue, 'created_at', 'desc');

  function handleCreated(plan) {
    setIsModalOpen(false);
    navigate(`/haccp/${plan.id}`);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? plans.filter((plan) => scopeIds.includes(plan.id)) : plans;
    const headers = ['Titre', 'Produit', 'Statut', 'Service', 'Créé le'];
    const rows = source.map((plan) => [
      plan.title,
      plan.product_description || '',
      PLAN_STATUS_LABELS[plan.status] || plan.status,
      plan.service?.name || '',
      formatDate(plan.created_at),
    ]);
    exportToCsv(`haccp-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? plans.filter((plan) => scopeIds.includes(plan.id)) : plans;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre', width: 0.32 },
        { key: 'status', label: 'Statut', width: 0.16 },
        { key: 'service', label: 'Service', width: 0.24 },
        { key: 'created_at', label: 'Créé le', width: 0.28 },
      ];
      const rows = source.map((plan) => ({
        title: plan.title,
        status: PLAN_STATUS_LABELS[plan.status] || plan.status,
        service: plan.service?.name || '',
        created_at: formatDate(plan.created_at),
      }));
      await exportToPdf(`haccp-${new Date().toISOString().slice(0, 10)}.pdf`, 'Plans HACCP', columns, rows, {
        subtitle: `${source.length} plan${source.length > 1 ? 's' : ''}`,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">HACCP</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={plans.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || plans.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Nouveau plan
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={PLAN_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {canManage && <SelectAllToggle ids={sortedPlans.map((plan) => plan.id)} selectedIds={selectedIds} onChange={setSelectedIds} />}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedIds)}
          onExportPdf={() => handleExportPdf(selectedIds)}
          exportingPdf={exportingPdf}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucun plan HACCP enregistré pour l'instant</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Créer le premier plan
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/haccp/${plan.id}`)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
            >
              {canManage && (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(plan.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(plan.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{plan.title}</p>
                <p className="truncate text-sm text-slate-500">
                  {plan.product_description ? plan.product_description : 'Aucun produit décrit'}
                  {plan.service ? ` · ${plan.service.name}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PlanStatusBadge status={plan.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewPlanModal services={services} categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="haccp_plan"
          endpoint="/haccp/plans/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}
    </div>
  );
}
