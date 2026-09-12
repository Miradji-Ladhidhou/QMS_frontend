import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  FolderCog,
  FolderInput,
  FolderPlus,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { openBlankTab } from '../lib/openInNewTab.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { PLAN_STATUS_LABELS } from '../lib/haccpStatus.js';
import { exportTableCsv, exportToPdf, exportToXlsx, exportToWord, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import PlanStatusBadge from '../components/PlanStatusBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
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
const HACCP_RESOURCE_TYPE = 'haccp_plan';

const PLAN_SORT_OPTIONS = [
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
  { key: 'created_at', label: 'date de création' },
];

function getPlanSortValue(plan, key) {
  return plan[key];
}

function NewPlanModal({ services, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    product_description: '',
    scope: '',
    team: '',
    service_id: '',
    category_id: '',
    category_name: '',
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
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={HACCP_RESOURCE_TYPE}
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
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [plans, setPlans] = useState([]);
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
  const [exportingAuditPdf, setExportingAuditPdf] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingPlan, setMovingPlan] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: HACCP_RESOURCE_TYPE });

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleMovePlan(folderId) {
    const plan = movingPlan;
    setMovingPlan(null);
    try {
      const { data } = await api.patch(`/haccp/plans/${plan.id}`, { category_id: folderId || null });
      setPlans((prev) => prev.map((item) => (item.id === plan.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de ce plan HACCP.');
    }
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
      const [plansRes, servicesRes] = await Promise.all([
        api.get('/haccp/plans', { params }),
        api.get('/services'),
      ]);
      setPlans(plansRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
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

  // sortedPlans reste la liste COMPLÈTE (déjà triée) : naviguer dans un dossier ne fait que
  // choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste déjà
  // chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) = category_id
  // null.
  const currentFolderPlans = useMemo(
    () => sortedPlans.filter((plan) => (plan.category_id || null) === currentFolderId),
    [sortedPlans, currentFolderId]
  );

  function handleCreated(plan) {
    setIsModalOpen(false);
    navigate(`/haccp/${plan.id}`);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  async function handleExportCsv(scopeIds) {
    const source = scopeIds ? plans.filter((plan) => scopeIds.includes(plan.id)) : plans;
    setExportingCsv(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'product_description', label: 'Produit' },
        { key: 'status', label: 'Statut' },
        { key: 'service', label: 'Service' },
        { key: 'created_at', label: 'Créé le' },
      ];
      const rows = source.map((plan) => ({
        title: plan.title,
        product_description: plan.product_description || '',
        status: PLAN_STATUS_LABELS[plan.status] || plan.status,
        service: plan.service?.name || '',
        created_at: formatDate(plan.created_at),
      }));
      const countLabel = `${source.length} plan${source.length > 1 ? 's' : ''}`;
      await exportTableCsv(`haccp-${new Date().toISOString().slice(0, 10)}.csv`, 'Plans HACCP', columns, rows, {
        generatedBy: currentUser?.full_name,
        subtitle: statusFilter ? `${countLabel} · Statut : ${PLAN_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
      });
    } catch {
      setExportPdfError('Impossible de générer le CSV.');
    } finally {
      setExportingCsv(false);
    }
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
      const countLabel = `${source.length} plan${source.length > 1 ? 's' : ''}`;
      await exportToPdf(`haccp-${new Date().toISOString().slice(0, 10)}.pdf`, 'Plans HACCP', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${PLAN_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? plans.filter((plan) => scopeIds.includes(plan.id)) : plans;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'status', label: 'Statut' },
        { key: 'service', label: 'Service' },
        { key: 'created_at', label: 'Créé le' },
      ];
      const rows = source.map((plan) => ({
        title: plan.title,
        status: PLAN_STATUS_LABELS[plan.status] || plan.status,
        service: plan.service?.name || '',
        created_at: formatDate(plan.created_at),
      }));
      const countLabel = `${source.length} plan${source.length > 1 ? 's' : ''}`;
      await exportToXlsx(`haccp-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Plans HACCP', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${PLAN_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? plans.filter((plan) => scopeIds.includes(plan.id)) : plans;
    setExportingWord(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'status', label: 'Statut' },
        { key: 'service', label: 'Service' },
        { key: 'created_at', label: 'Créé le' },
      ];
      const rows = source.map((plan) => ({
        title: plan.title,
        status: PLAN_STATUS_LABELS[plan.status] || plan.status,
        service: plan.service?.name || '',
        created_at: formatDate(plan.created_at),
      }));
      const countLabel = `${source.length} plan${source.length > 1 ? 's' : ''}`;
      await exportToWord(`haccp-${new Date().toISOString().slice(0, 10)}.docx`, 'Plans HACCP', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${PLAN_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? plans.filter((plan) => scopeIds.includes(plan.id)) : plans;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'title', label: 'Titre' },
        { key: 'status', label: 'Statut' },
        { key: 'service', label: 'Service' },
        { key: 'created_at', label: 'Créé le' },
      ];
      const rows = source.map((plan) => ({
        title: plan.title,
        status: PLAN_STATUS_LABELS[plan.status] || plan.status,
        service: plan.service?.name || '',
        created_at: formatDate(plan.created_at),
      }));
      const countLabel = `${source.length} plan${source.length > 1 ? 's' : ''}`;
      await exportToDrive('HACCP', 'Plans HACCP', columns, rows, {
        subtitle: statusFilter ? `${countLabel} · Statut : ${PLAN_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
      setDriveSuccess('Enregistré sur le Drive partagé.');
    } catch (err) {
      setExportPdfError(err.response?.data?.error || "Impossible d'enregistrer sur le Drive.");
    } finally {
      setExportingDrive(false);
    }
  }

  // Distinct de handleExportPdf ci-dessus (qui ne liste que titre/statut/service) : celui-ci
  // génère le rapport d'audit détaillé (étapes, dangers, CCP, synthèse de surveillance) via
  // POST /haccp/plans/pdf — la même route que le bouton "Exporter en PDF" de HaccpDetail.jsx
  // pour un seul plan.
  async function handleExportAuditPdf(scopeIds) {
    const tab = openBlankTab();
    setError('');
    setExportingAuditPdf(true);
    try {
      const response = await api.post('/haccp/plans/pdf', { ids: scopeIds || undefined }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      if (tab) tab.location.href = url;
    } catch {
      tab?.close();
      setError("Impossible d'exporter l'analyse complète en PDF.");
    } finally {
      setExportingAuditPdf(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">HACCP</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportMenu
            disabled={plans.length === 0}
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
            onClick={() => handleExportAuditPdf(selectedIds.length > 0 ? selectedIds : undefined)}
            disabled={exportingAuditPdf || plans.length === 0}
            title="Rapport détaillé (étapes, dangers, CCP, surveillance) — pour un audit"
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingAuditPdf ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCheck size={18} />}
            Exporter l'analyse complète
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
      <PageGuide id="haccp" />

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Tous les plans" />

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
        <SelectAllToggle ids={currentFolderPlans.map((plan) => plan.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
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

          {plans.length === 0 && folders.length === 0 ? (
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
          ) : currentFolderPlans.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucun plan directement dans ce dossier.' : 'Aucun plan sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {currentFolderPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => navigate(`/haccp/${plan.id}`)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(plan.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(plan.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    )}
                    <div className="min-w-0 flex-1">
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
                  {canManage && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingPlan(plan);
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
        <NewPlanModal services={services} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={HACCP_RESOURCE_TYPE}
          endpoint="/haccp/plans/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={HACCP_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={HACCP_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingPlan && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={HACCP_RESOURCE_TYPE}
          initialFolderId={movingPlan.category_id || null}
          title="Déplacer"
          subtitle={movingPlan.title}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingPlan(null)}
          onSelect={handleMovePlan}
        />
      )}
    </div>
  );
}
