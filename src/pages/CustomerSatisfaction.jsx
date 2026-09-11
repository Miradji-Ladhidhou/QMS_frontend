import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderCog, FolderInput, FolderPlus, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { SATISFACTION_METHOD_LABELS } from '../lib/customerSatisfactionStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import SatisfactionMethodBadge from '../components/SatisfactionMethodBadge.jsx';
import SatisfactionScoreBadge from '../components/SatisfactionScoreBadge.jsx';
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
import PageGuide from '../components/PageGuide.jsx';

const CATEGORIES_BASE_URL = '/module-categories';
const SURVEY_RESOURCE_TYPE = 'customer_satisfaction';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const SURVEY_SORT_OPTIONS = [
  { key: 'survey_date', label: 'date' },
  { key: 'customer_name', label: 'client' },
  { key: 'score', label: 'note' },
];

function getSurveySortValue(survey, key) {
  return survey[key];
}

// Modale de création — ouverte à tous les rôles côté backend (POST /customer-satisfaction) :
// n'importe qui en contact avec le client peut consigner une enquête, même principe que
// Accidents.jsx/NonconformingOutputs.jsx.
function NewSurveyModal({ services, onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: '',
    survey_date: new Date().toISOString().slice(0, 10),
    method: 'questionnaire',
    score: '4',
    comments: '',
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
        categoryId = await resolvePersonalCategoryId('customer_satisfaction');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      customer_name: form.customer_name,
      survey_date: form.survey_date,
      method: form.method,
      score: Number(form.score),
      comments: form.comments || undefined,
      service_id: form.service_id || undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/customer-satisfaction', payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer cette enquête.');
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
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle enquête de satisfaction</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                required
                value={form.survey_date}
                onChange={(e) => updateField('survey_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Méthode</label>
              <select
                value={form.method}
                onChange={(e) => updateField('method', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.entries(SATISFACTION_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Note de satisfaction (1 à 5)</label>
            <select
              value={form.score}
              onChange={(e) => updateField('score', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="1">1 — Très insatisfait</option>
              <option value="2">2 — Insatisfait</option>
              <option value="3">3 — Neutre</option>
              <option value="4">4 — Satisfait</option>
              <option value="5">5 — Très satisfait</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Commentaires du client</label>
            <AutoTextarea
              rows={2}
              value={form.comments}
              onChange={(e) => updateField('comments', e.target.value)}
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
            resourceType={SURVEY_RESOURCE_TYPE}
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
            {submitting ? 'Enregistrement...' : 'Enregistrer l’enquête'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function CustomerSatisfaction() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [surveys, setSurveys] = useState([]);
  const [services, setServices] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingSurvey, setMovingSurvey] = useState(null);
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: SURVEY_RESOURCE_TYPE });

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleMoveSurvey(folderId) {
    const survey = movingSurvey;
    setMovingSurvey(null);
    try {
      const { data } = await api.patch(`/customer-satisfaction/${survey.id}`, { category_id: folderId || null });
      setSurveys((prev) => prev.map((item) => (item.id === survey.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette enquête.');
    }
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} enquête(s) sélectionnée(s) ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.delete('/customer-satisfaction/bulk', { data: { ids: selectedIds } });
      setSurveys((prev) => prev.filter((survey) => !selectedIds.includes(survey.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces enquêtes.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (methodFilter) params.method = methodFilter;
      const [surveysRes, servicesRes] = await Promise.all([
        api.get('/customer-satisfaction', { params }),
        api.get('/services'),
      ]);
      setSurveys(surveysRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
    } catch {
      setError('Impossible de charger le registre des enquêtes de satisfaction.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodFilter]);

  const searchedSurveys = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return surveys;
    return surveys.filter(
      (survey) => survey.customer_name.toLowerCase().includes(query) || (survey.comments || '').toLowerCase().includes(query)
    );
  }, [surveys, searchText]);

  const { sorted: sortedSurveys, sortKey, direction, setSortKey, toggleSort } = useSort(
    searchedSurveys,
    getSurveySortValue,
    'survey_date',
    'desc'
  );

  // Moyenne des notes affichées (après recherche/filtre) — §9.1.3 : les résultats de la
  // surveillance doivent être analysés, pas seulement collectés.
  const averageScore = useMemo(() => {
    if (sortedSurveys.length === 0) return null;
    const sum = sortedSurveys.reduce((acc, s) => acc + s.score, 0);
    return (sum / sortedSurveys.length).toFixed(1);
  }, [sortedSurveys]);

  // sortedSurveys reste la liste COMPLÈTE (recherche + tri) : naviguer dans un dossier ne fait
  // que choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste déjà
  // chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) = category_id
  // null.
  const currentFolderSurveys = useMemo(
    () => sortedSurveys.filter((survey) => (survey.category_id || null) === currentFolderId),
    [sortedSurveys, currentFolderId]
  );
  // Miroir de DELETE /customer-satisfaction/:id côté backend : admin/manager uniquement.
  const deletableIds = canManage ? currentFolderSurveys.map((survey) => survey.id) : [];

  function handleCreated(survey) {
    setIsModalOpen(false);
    navigate(`/customer-satisfaction/${survey.id}`);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Satisfaction client</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouvelle enquête
        </button>
      </div>
      <PageGuide id="customer-satisfaction" />

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {averageScore !== null && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className="text-slate-500">Note moyenne ({sortedSurveys.length} enquête{sortedSurveys.length > 1 ? 's' : ''})</span>
          <span className="text-base font-semibold text-slate-900">{averageScore}/5</span>
        </div>
      )}

      <div className="relative mt-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par client ou commentaire..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Toutes les méthodes</option>
          {Object.entries(SATISFACTION_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <SortSelect
          options={SURVEY_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Toutes les enquêtes" />

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

      {deletableIds.length > 0 && <SelectAllToggle ids={deletableIds} selectedIds={selectedIds} onChange={setSelectedIds} />}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
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

          {surveys.length === 0 && folders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
              <p className="text-base font-medium text-slate-700">Aucune enquête de satisfaction enregistrée pour l'instant</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                <Plus size={18} />
                Consigner la première enquête
              </button>
            </div>
          ) : currentFolderSurveys.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucune enquête directement dans ce dossier.' : 'Aucune enquête sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {currentFolderSurveys.map((survey) => (
                <div
                  key={survey.id}
                  onClick={() => navigate(`/customer-satisfaction/${survey.id}`)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(survey.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(survey.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{survey.customer_name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {formatDate(survey.survey_date)}
                        {survey.service?.name ? ` · ${survey.service.name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <SatisfactionMethodBadge method={survey.method} />
                      <SatisfactionScoreBadge score={survey.score} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {survey.linked_capa && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        CAPA {survey.linked_capa.number}
                      </span>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingSurvey(survey);
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <FolderInput size={12} />
                        Déplacer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <NewSurveyModal services={services} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType={SURVEY_RESOURCE_TYPE}
          endpoint="/customer-satisfaction/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={SURVEY_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={SURVEY_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingSurvey && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={SURVEY_RESOURCE_TYPE}
          initialFolderId={movingSurvey.category_id || null}
          title="Déplacer"
          subtitle={movingSurvey.customer_name}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingSurvey(null)}
          onSelect={handleMoveSurvey}
        />
      )}
    </div>
  );
}
