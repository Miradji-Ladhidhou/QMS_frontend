import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderCog, FolderInput, FolderPlus, GraduationCap, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useUsers } from '../lib/useUsers.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { AUDIT_STATUS_LABELS, AUDIT_TYPE_LABELS } from '../lib/auditStatus.js';
import { exportToPdf, exportToXlsx, exportToWord, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import AuditStatusBadge from '../components/AuditStatusBadge.jsx';
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
import AuditorQualification from '../components/AuditorQualification.jsx';
import { useAuditorQualifications } from '../lib/useAuditorQualifications.js';
import { QUALIFICATION_LABELS, qualificationOf, qualificationOptionSuffix } from '../lib/auditorQualification.js';

const CATEGORIES_BASE_URL = '/module-categories';
const AUDIT_RESOURCE_TYPE = 'audit';

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

function NewAuditModal({ users, services, qualifications, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    audit_type: 'process',
    scope: '',
    service_id: '',
    lead_auditor: '',
    planned_date: '',
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    {qualifications.trainings.length > 0 ? qualificationOptionSuffix(qualificationOf(qualifications.byUser, user.id).status) : ''}
                  </option>
                ))}
              </select>
              <AuditorQualification userId={form.lead_auditor} qualifications={qualifications} detailed />
            </div>
          </div>

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={AUDIT_RESOURCE_TYPE}
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
            {submitting ? 'Création...' : "Planifier l'audit"}
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
  const users = useUsers();
  const qualifications = useAuditorQualifications();
  const [services, setServices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [movingAudit, setMovingAudit] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: AUDIT_RESOURCE_TYPE });

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleMoveAudit(folderId) {
    const audit = movingAudit;
    setMovingAudit(null);
    try {
      const { data } = await api.patch(`/audits/${audit.id}`, { category_id: folderId || null });
      setAudits((prev) => prev.map((item) => (item.id === audit.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cet audit.');
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
      const [auditsRes, servicesRes] = await Promise.all([
        api.get('/audits', { params: statusFilter ? { status: statusFilter } : {} }),
        api.get('/services'),
      ]);
      setAudits(auditsRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
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

  // sortedAudits reste la liste COMPLÈTE (déjà triée) : naviguer dans un dossier ne fait que
  // choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste déjà
  // chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) = category_id
  // null.
  const currentFolderAudits = useMemo(
    () => sortedAudits.filter((audit) => (audit.category_id || null) === currentFolderId),
    [sortedAudits, currentFolderId]
  );

  function handleCreated(audit) {
    setIsModalOpen(false);
    navigate(`/audits/${audit.id}`);
  }

  // width uniquement pour le PDF (forPdf) — Excel/Word/CSV n'ont pas cette contrainte de
  // largeur imprimée (voir listReportXlsx.js/listReportWord.js, qui l'ignorent de toute façon).
  function buildExportColumns({ forPdf } = {}) {
    return [
      { key: 'title', label: 'Titre', width: forPdf ? 0.2 : undefined },
      { key: 'type', label: 'Type', width: forPdf ? 0.1 : undefined },
      { key: 'status', label: 'Statut', width: forPdf ? 0.1 : undefined },
      { key: 'scope', label: 'Périmètre', width: forPdf ? 0.16 : undefined },
      { key: 'service', label: 'Service', width: forPdf ? 0.1 : undefined },
      { key: 'auditor', label: 'Auditeur', width: forPdf ? 0.1 : undefined },
      { key: 'auditor_qualification', label: 'Qualification auditeur', width: forPdf ? 0.1 : undefined },
      { key: 'planned_date', label: 'Date planifiée', width: forPdf ? 0.1 : undefined },
      { key: 'completed_date', label: 'Date réalisée', width: forPdf ? 0.1 : undefined },
      { key: 'conclusion', label: 'Conclusion', width: forPdf ? 0.16 : undefined },
      { key: 'category', label: 'Dossier', width: forPdf ? 0.1 : undefined },
    ];
  }

  function buildExportRows(source) {
    return source.map((audit) => ({
      title: audit.title,
      type: AUDIT_TYPE_LABELS[audit.audit_type] || audit.audit_type,
      status: AUDIT_STATUS_LABELS[audit.status] || audit.status,
      scope: audit.scope || '',
      service: audit.service?.name || '',
      auditor: audit.lead?.full_name || '',
      auditor_qualification: audit.lead_auditor && qualifications.trainings.length > 0 ? QUALIFICATION_LABELS[qualificationOf(qualifications.byUser, audit.lead_auditor).status] : '',
      planned_date: formatDate(audit.planned_date),
      completed_date: formatDate(audit.completed_date),
      conclusion: audit.conclusion || '',
      category: audit.category?.name || '',
    }));
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? audits.filter((audit) => scopeIds.includes(audit.id)) : audits;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
      await exportToPdf(`audits-${new Date().toISOString().slice(0, 10)}.pdf`, 'Audits internes', buildExportColumns({ forPdf: true }), buildExportRows(source), {
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
      const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
      await exportToXlsx(`audits-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Audits internes', buildExportColumns(), buildExportRows(source), {
        subtitle: statusFilter ? `${countLabel} · Statut : ${AUDIT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? audits.filter((audit) => scopeIds.includes(audit.id)) : audits;
    setExportingWord(true);
    setExportPdfError('');
    try {
      const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
      await exportToWord(`audits-${new Date().toISOString().slice(0, 10)}.docx`, 'Audits internes', buildExportColumns(), buildExportRows(source), {
        subtitle: statusFilter ? `${countLabel} · Statut : ${AUDIT_STATUS_LABELS[statusFilter] || statusFilter}` : countLabel,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? audits.filter((audit) => scopeIds.includes(audit.id)) : audits;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const countLabel = `${source.length} audit${source.length > 1 ? 's' : ''}`;
      await exportToDrive('AUDIT', 'Audits internes', buildExportColumns({ forPdf: true }), buildExportRows(source), {
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
          <ExportMenu
            disabled={audits.length === 0}
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
              Nouvel audit
            </button>
          )}
        </div>
      </div>
      <PageGuide id="audits" />

      {!qualifications.loading && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <GraduationCap size={16} className="shrink-0 text-primary" />
          {qualifications.trainings.length > 0 ? (
            <>
              <span>Qualification des auditeurs :</span>
              {qualifications.trainings.map((training, index) => (
                <span key={training.id}>
                  <Link to={`/trainings?training=${training.id}`} className="font-medium text-primary hover:underline">
                    {training.title}
                  </Link>
                  {index < qualifications.trainings.length - 1 ? ',' : ''}
                </span>
              ))}
            </>
          ) : (
            <>
              <span>Aucune formation d'auditeur interne désignée.</span>
              <Link to="/trainings" className="font-medium text-primary hover:underline">
                Désigner une formation
              </Link>
            </>
          )}
        </div>
      )}

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
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Tous les audits" />

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
        <SelectAllToggle ids={currentFolderAudits.map((audit) => audit.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
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

          {audits.length === 0 && folders.length === 0 ? (
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
          ) : currentFolderAudits.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucun audit directement dans ce dossier.' : 'Aucun audit sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {currentFolderAudits.map((audit) => (
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
                    {audit.lead_auditor && (
                      <div className="mt-1">
                        <AuditorQualification userId={audit.lead_auditor} qualifications={qualifications} />
                      </div>
                    )}
                    {canManage && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingAudit(audit);
                          }}
                          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <FolderInput size={12} />
                          Déplacer
                        </button>
                      </div>
                    )}
                  </div>
                  <AuditStatusBadge status={audit.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <NewAuditModal
          users={users}
          services={services}
          qualifications={qualifications}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={AUDIT_RESOURCE_TYPE}
          endpoint="/audits/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={AUDIT_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={AUDIT_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingAudit && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={AUDIT_RESOURCE_TYPE}
          initialFolderId={movingAudit.category_id || null}
          title="Déplacer"
          subtitle={movingAudit.title}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingAudit(null)}
          onSelect={handleMoveAudit}
        />
      )}
    </div>
  );
}
