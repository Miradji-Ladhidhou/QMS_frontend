import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Folder, FolderCog, List, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { SATISFACTION_METHOD_LABELS } from '../lib/customerSatisfactionStatus.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import SatisfactionMethodBadge from '../components/SatisfactionMethodBadge.jsx';
import SatisfactionScoreBadge from '../components/SatisfactionScoreBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import PageGuide from '../components/PageGuide.jsx';

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
function NewSurveyModal({ services, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: '',
    survey_date: new Date().toISOString().slice(0, 10),
    method: 'questionnaire',
    score: '4',
    comments: '',
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
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
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
  async function handleCategoryChange(event, survey) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(survey.id);
    try {
      const { data } = await api.patch(`/customer-satisfaction/${survey.id}`, { category_id: categoryId });
      setSurveys((prev) => prev.map((item) => (item.id === survey.id ? data : item)));
    } catch {
      setError('Impossible de changer le dossier de cette enquête.');
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
      const [surveysRes, servicesRes, categoriesRes] = await Promise.all([
        api.get('/customer-satisfaction', { params }),
        api.get('/services'),
        api.get('/module-categories', { params: { resource_type: 'customer_satisfaction' } }),
      ]);
      setSurveys(surveysRes.data);
      setServices(servicesRes.data.filter((service) => service.is_active));
      setCategories(categoriesRes.data);
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

  // Un dossier par catégorie (module_categories, resource_type='customer_satisfaction'), plus
  // un dossier "Sans dossier" en dernier — même principe que NonconformingOutputs.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const survey of sortedSurveys) {
      if (survey.category_id && byCategory.has(survey.category_id)) byCategory.get(survey.category_id).push(survey);
      else unfiled.push(survey);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, surveys: byCategory.get(category.id) || [] }))
      .filter((group) => group.surveys.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, surveys: unfiled });
    return groups;
  }, [sortedSurveys, categories]);

  const isFolderView = viewMode === 'folder';
  const surveyGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, surveys: sortedSurveys }];
  // Miroir de DELETE /customer-satisfaction/:id côté backend : admin/manager uniquement.
  const deletableIds = canManage ? sortedSurveys.map((survey) => survey.id) : [];

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

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : surveys.length === 0 ? (
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
      ) : (
        <div className="mt-4 space-y-3">
          {surveyGroups.map((group) => (
            <div key={group.key}>
              {isFolderView && (
                <button
                  type="button"
                  onClick={() => toggleFolder(group.key)}
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm"
                >
                  {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                  {group.category ? group.category.name : 'Sans dossier'}
                  <span className="font-normal text-slate-400">({group.surveys.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) && (
                <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                  {group.surveys.map((survey) => (
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
                        <CategoryBadge category={survey.category} />
                        {survey.linked_capa && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            CAPA {survey.linked_capa.number}
                          </span>
                        )}
                        {canManage && (
                          <select
                            value={survey.category_id || ''}
                            disabled={updatingCategoryId === survey.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCategoryChange(e, survey)}
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
        <NewSurveyModal services={services} categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="customer_satisfaction"
          endpoint="/customer-satisfaction/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && <ManageCategoriesModal
          baseUrl="/module-categories"
          resourceType="customer_satisfaction"
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={loadData}
        />}
    </div>
  );
}
