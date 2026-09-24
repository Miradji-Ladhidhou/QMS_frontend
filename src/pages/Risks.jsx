import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, FolderCog, FolderInput, FolderPlus, Plus, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useUsers } from '../lib/useUsers.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import {
  RISK_TYPE_LABELS,
  RISK_STATUS_LABELS,
  LIKELIHOOD_LABELS,
  IMPACT_LABELS,
  riskLevel,
  RISK_LEVEL_CELL_STYLES,
} from '../lib/riskStatus.js';
import { exportToPdf, exportToXlsx, exportToWord, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import RiskStatusBadge from '../components/RiskStatusBadge.jsx';
import RiskScoreBadge from '../components/RiskScoreBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import FolderTile from '../components/FolderTile.jsx';
import NewFolderModal from '../components/NewFolderModal.jsx';
import FolderBreadcrumb from '../components/FolderBreadcrumb.jsx';
import FolderPickerModal from '../components/FolderPickerModal.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import AiRiskSuggestion from '../components/AiRiskSuggestion.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import PageGuide from '../components/PageGuide.jsx';
import Pagination from '../components/Pagination.jsx';
import RiskThresholdBanner from '../components/risks/RiskThresholdBanner.jsx';
import RiskKpiSuggestions from '../components/risks/RiskKpiSuggestions.jsx';
import RiskReviewModal from '../components/risks/RiskReviewModal.jsx';
import { riskDraftFromKpi } from '../lib/riskKpiSuggestion.js';
import { daysUntil } from '../lib/riskReview.js';

const CATEGORIES_BASE_URL = '/module-categories';
const RISK_RESOURCE_TYPE = 'risk';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const RISK_SORT_OPTIONS = [
  { key: 'risk_score', label: 'score de risque' },
  { key: 'title', label: 'titre' },
  { key: 'type', label: 'type' },
  { key: 'owner', label: 'propriétaire' },
  { key: 'review_date', label: 'date de revue' },
  { key: 'status', label: 'statut' },
];

function getRiskSortValue(risk, key) {
  if (key === 'owner') return risk.owner_user?.full_name || '';
  return risk[key];
}

// Matrice 5x5 : gravité en ligne (5 en haut, 1 en bas — convention standard), probabilité en
// colonne (1 à gauche, 5 à droite). Compte les risques actifs (hors clôturé/accepté) par
// cellule likelihood x impact, colorée selon la bande de score de cette cellule.
function RiskMatrix({ risks }) {
  const counts = {};
  for (const risk of risks) {
    if (risk.status === 'closed' || risk.status === 'accepted') continue;
    const key = `${risk.likelihood}-${risk.impact}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  const impacts = [5, 4, 3, 2, 1];
  const likelihoods = [1, 2, 3, 4, 5];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Matrice des risques</h2>
      {/* Cellules et colonne d'étiquettes réduites sur mobile (5 × 56px + 96px = 376px ne
          tenait pas dans une carte à ~260-310px de large sur téléphone, forçant un défilement
          horizontal peu lisible pour un petit widget 5x5 censé se voir d'un coup d'œil) — repli
          sur des cellules 36px/colonne 48px qui tiennent sans défiler, taille d'origine dès
          sm:. overflow-x-auto sur le conteneur reste un filet de sécurité, pas la solution. */}
      <div className="inline-block">
        <div className="flex">
          <div className="w-12 shrink-0 sm:w-24" />
          <div className="flex-1 text-center text-[11px] font-medium text-slate-500 sm:text-xs">Probabilité →</div>
        </div>
        {impacts.map((impact) => (
          <div key={impact} className="flex items-center">
            <div className="w-12 shrink-0 truncate pr-1 text-right text-[10px] text-slate-500 sm:w-24 sm:pr-2 sm:text-xs">
              {IMPACT_LABELS[impact]}
            </div>
            {likelihoods.map((likelihood) => {
              const score = likelihood * impact;
              const level = riskLevel(score);
              const count = counts[`${likelihood}-${impact}`] || 0;
              return (
                <div
                  key={likelihood}
                  title={`Probabilité ${likelihood} × Gravité ${impact} = ${score}`}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center border border-white text-xs font-semibold text-slate-800 sm:h-14 sm:w-14 sm:text-sm ${RISK_LEVEL_CELL_STYLES[level]}`}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-1 flex">
          <div className="w-12 shrink-0 sm:w-24" />
          {likelihoods.map((likelihood) => (
            <div key={likelihood} className="w-9 shrink-0 text-center text-[10px] text-slate-400 sm:w-14 sm:text-xs">
              {likelihood}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">Gravité ↑ — les risques traités/acceptés/clôturés n'apparaissent pas ici.</p>
    </div>
  );
}

function NewRiskModal({ users, services, initial, kpiId, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    type: 'risk',
    category: initial?.category || '',
    description: initial?.description || '',
    service_id: '',
    owner: '',
    likelihood: '3',
    impact: '3',
    review_date: '',
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
        categoryId = await resolvePersonalCategoryId('risk');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      type: form.type,
      category: form.category || undefined,
      description: form.description || undefined,
      service_id: form.service_id || undefined,
      owner: form.owner || undefined,
      likelihood: Number(form.likelihood),
      impact: Number(form.impact),
      review_date: form.review_date || undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/risks', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le risque.');
      setSubmitting(false);
      return;
    }
    // Risque proposé depuis un KPI hors objectif : on le rattache à ce KPI (il quitte alors les suggestions).
    // Un échec du lien n'annule pas le risque, déjà créé : il peut être ajouté à la main depuis sa fiche.
    if (kpiId) {
      await api.post(`/risks/${response.data.id}/links`, { kind: 'kpi', ref_id: kpiId }).catch(() => {});
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau risque / opportunité</h2>
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
              placeholder="Ex : Dépendance à un fournisseur unique"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(RISK_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
              <input
                type="text"
                placeholder="Ex : Fournisseurs, Processus..."
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <AutoTextarea
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Probabilité</label>
              <select
                value={form.likelihood}
                onChange={(e) => updateField('likelihood', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(LIKELIHOOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} — {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
              <select
                value={form.impact}
                onChange={(e) => updateField('impact', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(IMPACT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} — {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
              <select
                value={form.owner}
                onChange={(e) => updateField('owner', e.target.value)}
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine date de revue</label>
            <input
              type="date"
              value={form.review_date}
              onChange={(e) => updateField('review_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={RISK_RESOURCE_TYPE}
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

function AnalyzeServiceModal({ services, onClose, onAdded }) {
  const [serviceId, setServiceId] = useState('');
  const [context, setContext] = useState('');

  const serviceName = services.find((service) => service.id === serviceId)?.name || '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Analyser un service avec l'IA</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Service</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Choisir un service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description de l'activité</label>
            <AutoTextarea
              rows={3}
              placeholder="Ex : Réception des matières premières, stockage en entrepôt, préparation et expédition des commandes clients..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <AiRiskSuggestion serviceId={serviceId || undefined} serviceName={serviceName} context={context} onAdded={onAdded} />
        </div>
      </div>
    </div>
  );
}
export default function Risks() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [risks, setRisks] = useState([]);
  const users = useUsers();
  const [services, setServices] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
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
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingRisk, setMovingRisk] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [kpiSuggestion, setKpiSuggestion] = useState(null);
  const [onlyNeedsCapa, setOnlyNeedsCapa] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [insightsKey, setInsightsKey] = useState(0);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: RISK_RESOURCE_TYPE });

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleMoveRisk(folderId) {
    const risk = movingRisk;
    setMovingRisk(null);
    try {
      const { data } = await api.patch(`/risks/${risk.id}`, { category_id: folderId || null });
      setRisks((prev) => prev.map((item) => (item.id === risk.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de ce risque.');
    }
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} risque(s) sélectionné(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/risks/bulk', { data: { ids: selectedIds } });
      setRisks((prev) => prev.filter((risk) => !selectedIds.includes(risk.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces risques.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (serviceFilter) params.service_id = serviceFilter;
      const [risksRes, servicesRes] = await Promise.all([
        api.get('/risks', { params }),
        api.get('/services'),
      ]);
      setRisks(risksRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
    } catch {
      setError('Impossible de charger le registre des risques.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, serviceFilter]);

  // Nombre de risques à revoir (bouton « À revoir ») : rechargé après chaque revue ou création.
  useEffect(() => {
    if (!canManage) return;
    api
      .get('/risks/review-queue')
      .then(({ data }) => setReviewCount(data.items.length))
      .catch(() => setReviewCount(0));
  }, [canManage, insightsKey]);

  const { sorted: sortedRisks, sortKey, direction, setSortKey, toggleSort } = useSort(
    risks,
    getRiskSortValue,
    'risk_score',
    'desc'
  );

  // sortedRisks reste la liste COMPLÈTE (tous dossiers confondus, filtrée seulement par
  // type/statut/service) : la matrice des risques et les exports en ont besoin telle quelle,
  // un portefeuille de risques n'a de sens qu'au global. Naviguer dans un dossier ne fait que
  // choisir, côté affichage, quel sous-ensemble de cette même liste montrer — un filtrage
  // client (pas un aller-retour serveur par dossier) puisque la liste complète est de toute
  // façon déjà chargée pour la matrice. "Sans dossier" (racine) = category_id null, même
  // convention que folder_id sur les KPI.
  const currentFolderRisks = useMemo(
    () => sortedRisks.filter((risk) => (risk.category_id || null) === currentFolderId && (!onlyNeedsCapa || risk.needs_capa)),
    [sortedRisks, currentFolderId, onlyNeedsCapa]
  );
  const [riskPage, setRiskPage] = useState(1);
  const riskTotalPages = Math.max(1, Math.ceil(currentFolderRisks.length / 25));
  const pagedRisks = currentFolderRisks.slice((riskPage - 1) * 25, riskPage * 25);
  useEffect(() => setRiskPage(1), [currentFolderId, searchText, statusFilter, typeFilter]);
  useEffect(() => { if (riskPage > riskTotalPages) setRiskPage(riskTotalPages); }, [riskPage, riskTotalPages]);

  function handleCreated(risk) {
    setIsModalOpen(false);
    setKpiSuggestion(null);
    setInsightsKey((key) => key + 1);
    navigate(`/risks/${risk.id}`);
  }

  function buildExportColumns({ forPdf } = {}) {
    return [
      { key: 'title', label: 'Titre', width: forPdf ? 0.12 : undefined },
      { key: 'type', label: 'Type', width: forPdf ? 0.06 : undefined },
      { key: 'category', label: 'Catégorie', width: forPdf ? 0.08 : undefined },
      { key: 'description', label: 'Description', width: forPdf ? 0.14 : undefined },
      { key: 'status', label: 'Statut', width: forPdf ? 0.07 : undefined },
      { key: 'service', label: 'Service', width: forPdf ? 0.07 : undefined },
      { key: 'likelihood', label: 'Probabilité', width: forPdf ? 0.05 : undefined },
      { key: 'impact', label: 'Impact', width: forPdf ? 0.05 : undefined },
      { key: 'score', label: 'Score', width: forPdf ? 0.05 : undefined },
      { key: 'current_controls', label: 'Maîtrises actuelles', width: forPdf ? 0.1 : undefined },
      { key: 'treatment_plan', label: 'Plan de traitement', width: forPdf ? 0.1 : undefined },
      { key: 'residual_likelihood', label: 'Probabilité résiduelle', width: forPdf ? 0.06 : undefined },
      { key: 'residual_impact', label: 'Impact résiduel', width: forPdf ? 0.06 : undefined },
      { key: 'residual_score', label: 'Score résiduel', width: forPdf ? 0.06 : undefined },
      { key: 'owner', label: 'Responsable', width: forPdf ? 0.08 : undefined },
      { key: 'review_date', label: 'Revue', width: forPdf ? 0.07 : undefined },
      { key: 'linked_capa', label: 'CAPA liée', width: forPdf ? 0.06 : undefined },
      { key: 'folder', label: 'Dossier', width: forPdf ? 0.06 : undefined },
    ];
  }

  function buildExportRows(source) {
    return source.map((risk) => ({
      title: risk.title,
      type: RISK_TYPE_LABELS[risk.type] || risk.type,
      category: risk.category || '',
      description: risk.description || '',
      status: RISK_STATUS_LABELS[risk.status] || risk.status,
      service: risk.service?.name || '',
      likelihood: risk.likelihood ?? '',
      impact: risk.impact ?? '',
      score: risk.risk_score ?? '',
      current_controls: risk.current_controls || '',
      treatment_plan: risk.treatment_plan || '',
      residual_likelihood: risk.residual_likelihood ?? '',
      residual_impact: risk.residual_impact ?? '',
      residual_score: risk.residual_score ?? '',
      owner: risk.owner_user?.full_name || '',
      review_date: formatDate(risk.review_date),
      linked_capa: risk.linked_capa?.number || '',
      folder: risk.folder?.name || '',
    }));
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? risks.filter((risk) => scopeIds.includes(risk.id)) : risks;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const countLabel = `${source.length} risque${source.length > 1 ? 's' : ''}`;
      const filterParts = [];
      if (typeFilter) filterParts.push(`Type : ${RISK_TYPE_LABELS[typeFilter] || typeFilter}`);
      if (statusFilter) filterParts.push(`Statut : ${RISK_STATUS_LABELS[statusFilter] || statusFilter}`);
      if (serviceFilter) filterParts.push(`Service : ${services.find((s) => s.id === serviceFilter)?.name || serviceFilter}`);
      await exportToPdf(`risques-${new Date().toISOString().slice(0, 10)}.pdf`, 'Registre des risques', buildExportColumns({ forPdf: true }), buildExportRows(source), {
        subtitle: [countLabel, ...filterParts].join(' · '),
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? risks.filter((risk) => scopeIds.includes(risk.id)) : risks;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const countLabel = `${source.length} risque${source.length > 1 ? 's' : ''}`;
      const filterParts = [];
      if (typeFilter) filterParts.push(`Type : ${RISK_TYPE_LABELS[typeFilter] || typeFilter}`);
      if (statusFilter) filterParts.push(`Statut : ${RISK_STATUS_LABELS[statusFilter] || statusFilter}`);
      if (serviceFilter) filterParts.push(`Service : ${services.find((s) => s.id === serviceFilter)?.name || serviceFilter}`);
      await exportToXlsx(`risques-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Registre des risques', buildExportColumns(), buildExportRows(source), {
        subtitle: [countLabel, ...filterParts].join(' · '),
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? risks.filter((risk) => scopeIds.includes(risk.id)) : risks;
    setExportingWord(true);
    setExportPdfError('');
    try {
      const countLabel = `${source.length} risque${source.length > 1 ? 's' : ''}`;
      const filterParts = [];
      if (typeFilter) filterParts.push(`Type : ${RISK_TYPE_LABELS[typeFilter] || typeFilter}`);
      if (statusFilter) filterParts.push(`Statut : ${RISK_STATUS_LABELS[statusFilter] || statusFilter}`);
      if (serviceFilter) filterParts.push(`Service : ${services.find((s) => s.id === serviceFilter)?.name || serviceFilter}`);
      await exportToWord(`risques-${new Date().toISOString().slice(0, 10)}.docx`, 'Registre des risques', buildExportColumns(), buildExportRows(source), {
        subtitle: [countLabel, ...filterParts].join(' · '),
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? risks.filter((risk) => scopeIds.includes(risk.id)) : risks;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const countLabel = `${source.length} risque${source.length > 1 ? 's' : ''}`;
      const filterParts = [];
      if (typeFilter) filterParts.push(`Type : ${RISK_TYPE_LABELS[typeFilter] || typeFilter}`);
      if (statusFilter) filterParts.push(`Statut : ${RISK_STATUS_LABELS[statusFilter] || statusFilter}`);
      if (serviceFilter) filterParts.push(`Service : ${services.find((s) => s.id === serviceFilter)?.name || serviceFilter}`);
      await exportToDrive('RISQUE', 'Registre des risques', buildExportColumns({ forPdf: true }), buildExportRows(source), {
        subtitle: [countLabel, ...filterParts].join(' · '),
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
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Registre des risques</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportMenu
            disabled={risks.length === 0}
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
              onClick={() => setIsReviewOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ClipboardList size={18} />
              À revoir
              {reviewCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{reviewCount}</span>}
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setIsAnalyzeModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md border border-purple-300 px-4 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
            >
              <Sparkles size={18} />
              Analyser un service avec l'IA
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <Plus size={18} />
              Nouveau risque
            </button>
          )}
        </div>
      </div>
      <PageGuide id="risks" />
      <RiskThresholdBanner
        risks={risks}
        isAdmin={currentUser?.role === 'admin'}
        refreshKey={insightsKey}
        onlyNeedsCapa={onlyNeedsCapa}
        onToggleFilter={() => setOnlyNeedsCapa((value) => !value)}
        onChanged={loadData}
      />
      {canManage && <RiskKpiSuggestions refreshKey={insightsKey} onCreate={setKpiSuggestion} />}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}

      {!loading && risks.length > 0 && (
        <div className="mt-4">
          <RiskMatrix risks={risks} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les types</option>
          {Object.entries(RISK_TYPE_LABELS).map(([value, label]) => (
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
          {Object.entries(RISK_STATUS_LABELS).map(([value, label]) => (
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

        <SortSelect
          options={RISK_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Tous les risques" />

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
        <SelectAllToggle ids={currentFolderRisks.map((risk) => risk.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
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

          {risks.length === 0 && folders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
              <p className="text-base font-medium text-slate-700">Aucun risque enregistré pour l'instant</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                >
                  <Plus size={18} />
                  Créer le premier risque
                </button>
              )}
            </div>
          ) : currentFolderRisks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucun risque directement dans ce dossier.' : 'Aucun risque sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pagedRisks.map((risk) => (
                <div
                  key={risk.id}
                  onClick={() => navigate(`/risks/${risk.id}`)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    {canManage && (
                      <label className="-m-3 flex shrink-0 cursor-pointer items-center justify-center p-3 sm:-m-1 sm:p-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(risk.id)}
                          onChange={() => toggleSelect(risk.id)}
                          aria-label={`Sélectionner ${risk.title}`}
                          className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary sm:h-4 sm:w-4"
                        />
                      </label>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words font-medium text-slate-900">{risk.title}</p>
                      <p className="break-words text-sm text-slate-500">
                        {RISK_TYPE_LABELS[risk.type]}
                        {risk.owner_user ? ` · ${risk.owner_user.full_name}` : ''}
                        {risk.review_date ? ` · Revue le ${formatDate(risk.review_date)}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <RiskScoreBadge score={risk.risk_score} />
                        {risk.residual_score !== null && risk.residual_score !== undefined && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Résiduel {risk.residual_score}</span>
                        )}
                        <RiskStatusBadge status={risk.status} />
                        {risk.is_unacceptable && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Inacceptable</span>}
                        {risk.needs_capa && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Sans CAPA</span>}
                        {risk.review_date && !['accepted', 'closed'].includes(risk.status) && daysUntil(risk.review_date) < 0 && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Revue dépassée</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingRisk(risk);
                        }}
                        className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:min-h-0 sm:px-2"
                      >
                        <FolderInput size={12} />
                        Déplacer
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <Pagination page={riskPage} totalPages={riskTotalPages} onPageChange={setRiskPage} />
            </div>
          )}
        </>
      )}

      {(isModalOpen || kpiSuggestion) && (
        <NewRiskModal
          users={users}
          services={services}
          initial={kpiSuggestion ? riskDraftFromKpi(kpiSuggestion) : undefined}
          kpiId={kpiSuggestion?.kpi_id}
          onClose={() => {
            setIsModalOpen(false);
            setKpiSuggestion(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {isReviewOpen && (
        <RiskReviewModal
          onClose={() => setIsReviewOpen(false)}
          onReviewed={() => {
            setInsightsKey((key) => key + 1);
            loadData();
          }}
        />
      )}

      {isAnalyzeModalOpen && (
        <AnalyzeServiceModal services={services} onClose={() => setIsAnalyzeModalOpen(false)} onAdded={loadData} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={RISK_RESOURCE_TYPE}
          endpoint="/risks/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={RISK_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={RISK_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingRisk && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={RISK_RESOURCE_TYPE}
          initialFolderId={movingRisk.category_id || null}
          title="Déplacer"
          subtitle={movingRisk.title}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingRisk(null)}
          onSelect={handleMoveRisk}
        />
      )}
    </div>
  );
}
