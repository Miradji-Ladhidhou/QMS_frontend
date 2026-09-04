import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Cloud, Download, Folder, FolderPlus, HardDrive, List, Loader2, Plus, Search, Server, Upload, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useTenant } from '../lib/useTenant.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { isManagerRole } from '../lib/roles.js';
import { STATUS_LABELS } from '../lib/documentStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx, exportToDrive } from '../lib/pdfExport.js';
import { useSort } from '../lib/useSort.js';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import SearchSnippet from '../components/SearchSnippet.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import SortableTh from '../components/SortableTh.jsx';
import SortSelect from '../components/SortSelect.jsx';
import UploadErrorMessage from '../components/UploadErrorMessage.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import DocumentBulkMoveModal from '../components/DocumentBulkMoveModal.jsx';
import { openBlankTab } from '../lib/openInNewTab.js';

const SEARCH_DEBOUNCE_MS = 300;

const DOCUMENT_SORT_OPTIONS = [
  { key: 'created_at', label: 'date de création' },
  { key: 'number', label: 'numéro' },
  { key: 'title', label: 'titre' },
  { key: 'category', label: 'catégorie' },
  { key: 'version', label: 'version' },
  { key: 'status', label: 'statut' },
  { key: 'review_date', label: 'prochaine révision' },
];

function getDocumentSortValue(doc, key) {
  if (key === 'category') return doc.category?.name || '';
  return doc[key];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function MatchLocationBadge({ location }) {
  if (!location) return null;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        location === 'title' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {location === 'title' ? 'Trouvé dans le titre' : 'Trouvé dans le contenu'}
    </span>
  );
}

// Prompt F2 : indicateur discret de provenance, basé sur storage_provider DU DOCUMENT (pas du
// tenant globalement) — un tenant peut avoir des documents historiques Supabase à côté de
// nouveaux documents sur Drive. Seule l'icône Drive est cliquable (ouvre dans Drive) ; l'icône
// Supabase est purement informative.
function StorageProvenanceIcon({ doc, onOpenInDrive, opening }) {
  if (doc.storage_provider === 'google_drive') {
    return (
      <button
        type="button"
        onClick={(e) => onOpenInDrive(e, doc)}
        disabled={opening}
        title="Ouvrir dans Google Drive"
        aria-label="Ouvrir dans Google Drive"
        className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary disabled:opacity-40"
      >
        {opening ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
      </button>
    );
  }

  return (
    <span title="Stocké sur nos serveurs" className="shrink-0 p-1.5 text-slate-300">
      <Server size={14} />
    </span>
  );
}

function DocumentModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    number: '',
    title: '',
    description: '',
    category_id: '',
    review_date: '',
    review_frequency_months: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.append('number', form.number);
    formData.append('title', form.title);
    if (form.description) formData.append('description', form.description);
    if (form.category_id) formData.append('category_id', form.category_id);
    if (form.review_date) formData.append('review_date', form.review_date);
    if (form.review_frequency_months) formData.append('review_frequency_months', form.review_frequency_months);
    if (file) formData.append('file', file);

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le handler du parent ne doit pas se faire passer pour un échec d'upload.
    let data;
    try {
      ({ data } = await api.post('/documents', formData));
    } catch (err) {
      setError({ message: err.response?.data?.error || 'Impossible de créer le document.', code: err.response?.data?.code });
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
          <h2 className="text-lg font-semibold text-slate-900">Nouveau document</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <UploadErrorMessage error={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Numéro</label>
            <input
              type="text"
              required
              value={form.number}
              onChange={(e) => updateField('number', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <AutoTextarea
              rows={3}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
            <select
              value={form.category_id}
              onChange={(e) => updateField('category_id', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Aucune</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine révision</label>
              <input
                type="date"
                value={form.review_date}
                onChange={(e) => updateField('review_date', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-slate-400">Laisser vide pour calculer depuis la fréquence par défaut.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence de révision (mois)</label>
              <input
                type="number"
                min="1"
                placeholder="Défaut du tenant"
                value={form.review_frequency_months}
                onChange={(e) => updateField('review_frequency_months', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fichier</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer le document'}
          </button>
        </form>
      </div>
    </div>
  );
}

const RESULT_STATUS_STYLES = {
  created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};
const RESULT_STATUS_LABELS = { created: 'Créé', warning: 'Créé (avec avertissement)', error: 'Erreur' };

function ImportDocumentsModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleDownloadTemplate() {
    setError('');
    setDownloadingTemplate(true);
    try {
      const response = await api.get('/documents/import-template.xlsx', { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'modele-import-documents.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError('Impossible de télécharger le modèle.');
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError('Sélectionnez le fichier Excel rempli.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/documents/import', formData);
      setResult(data);
      if (data.created_count > 0) onImported();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'importer le fichier.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Importer des documents</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {!result ? (
          <>
            <p className="mb-4 text-sm text-slate-500">
              Téléchargez le modèle, remplissez une ligne par document, puis renvoyez le fichier. Aucun fichier
              associé n'est créé par cet import — ajoutez-le ensuite depuis chaque fiche document.
            </p>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {downloadingTemplate ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Télécharger le modèle Excel
            </button>

            {error && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Fichier rempli (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? 'Import en cours...' : 'Importer'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">
              <span className="font-medium text-emerald-700">{result.created_count} document(s) créé(s)</span>
              {result.archived_count > 0 && (
                <span className="text-blue-700"> · {result.archived_count} version(s) archivée(s)</span>
              )}
              {result.error_count > 0 && (
                <span className="text-red-600"> · {result.error_count} ligne(s) en erreur</span>
              )}
            </p>

            <ul className="max-h-80 space-y-1.5 overflow-y-auto">
              {result.results.map((row) => (
                <li
                  key={row.row}
                  className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm ${RESULT_STATUS_STYLES[row.status]}`}
                >
                  <span>
                    <span className="font-medium">Ligne {row.row}</span>
                    {row.title ? ` — ${row.title}` : row.number ? ` — ${row.number}` : ''}
                    {row.message && <span className="block text-xs opacity-90">{row.message}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-medium">{RESULT_STATUS_LABELS[row.status]}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700"
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page Documents, sans passer par
// Paramètres > Catégories (CategoryManager.jsx, qui reste le seul endroit pour modifier/
// supprimer un dossier ou gérer ses permissions si restreint) — juste nom + couleur, pour créer
// vite un dossier au moment où on en a besoin en rangeant des documents.
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
      ({ data } = await api.post('/categories', { name, color }));
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
                placeholder="Ex : Qualité, RH, Procédures fournisseurs..."
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

export default function Documents() {
  const navigate = useNavigate();
  const tenant = useTenant();
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');
  const [openingDriveId, setOpeningDriveId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);

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
      !window.confirm(`Supprimer définitivement ${selectedIds.length} document(s) sélectionné(s) ? Cette action est irréversible.`)
    ) {
      return;
    }
    try {
      await api.delete('/documents/bulk', { data: { ids: selectedIds } });
      setDocuments((prev) => prev.filter((doc) => !selectedIds.includes(doc.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces documents.');
    }
  }

  async function handleCategoryChange(event, doc) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(doc.id);
    try {
      const { data } = await api.patch(`/documents/${doc.id}/category`, { category_id: categoryId });
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? data : d)));
    } catch {
      setError('Impossible de changer la catégorie de ce document.');
    } finally {
      setUpdatingCategoryId(null);
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [documentsRes, categoriesRes] = await Promise.all([api.get('/documents'), api.get('/categories')]);
      setDocuments(documentsRes.data);
      setCategories(categoriesRes.data);
    } catch {
      setError('Impossible de charger les documents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Recherche plein texte côté serveur, avec debounce pour ne pas spammer l'API à chaque frappe
  useEffect(() => {
    const term = search.trim();

    if (!term) {
      setSearchResults(null);
      setSearchError('');
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);

    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await api.get('/documents/search', { params: { q: term } });
        if (!cancelled) {
          setSearchResults(data);
          setSearchError('');
        }
      } catch {
        if (!cancelled) {
          setSearchError('La recherche a échoué.');
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [search]);

  // Réconcilie les résultats de recherche (id, extrait, localisation) avec les documents déjà chargés
  const searchResultDocuments = useMemo(() => {
    if (!searchResults) return null;

    const byId = new Map(documents.map((doc) => [doc.id, doc]));

    return searchResults
      .map((result) => {
        const doc = byId.get(result.id);
        if (!doc) return null;
        return { ...doc, snippet: result.snippet, match_location: result.match_location };
      })
      .filter(Boolean);
  }, [searchResults, documents]);

  const isSearchActive = searchResultDocuments !== null;

  const filteredDocuments = useMemo(() => {
    const base = searchResultDocuments ?? documents;
    return base.filter((doc) => {
      const matchesStatus = !statusFilter || doc.status === statusFilter;
      const matchesCategory = !categoryFilter || doc.category_id === categoryFilter;
      return matchesStatus && matchesCategory;
    });
  }, [documents, searchResultDocuments, statusFilter, categoryFilter]);

  const { sorted: sortedDocuments, sortKey, direction, setSortKey, toggleSort } = useSort(
    filteredDocuments,
    getDocumentSortValue,
    'number',
    'asc'
  );

  // Un dossier par catégorie (déjà triées par nom côté backend), plus un dossier "Sans dossier"
  // en dernier pour les documents non classés — jamais affiché s'il est vide. Reprend
  // sortedDocuments (déjà filtré/trié) pour que le mode dossier reste cohérent avec le mode
  // liste, seule la présentation change.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const doc of sortedDocuments) {
      if (doc.category_id && byCategory.has(doc.category_id)) byCategory.get(doc.category_id).push(doc);
      else unfiled.push(doc);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, docs: byCategory.get(category.id) || [] }))
      .filter((group) => group.docs.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, docs: unfiled });
    return groups;
  }, [sortedDocuments, categories]);

  // Le mode dossier n'a pas de sens pendant une recherche plein texte (le classement par
  // pertinence prime alors sur le rangement) — un seul groupe "virtuel" fait retomber les deux
  // blocs de rendu (mobile/desktop) sur exactement le même comportement qu'avant l'ajout des
  // dossiers, sans dupliquer leur JSX pour un cas "liste plate".
  const isFolderView = viewMode === 'folder' && !isSearchActive;
  const docGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, docs: sortedDocuments }];

  // file_path peut être un chemin Supabase ou un id de fichier Google Drive selon le provider
  // du document (voir B3) — seul le backend sait lequel et construit l'URL correspondante,
  // impossible à faire directement côté frontend comme avant (voir DocumentDetail.jsx).
  async function handleDownload(event, doc, existingTab) {
    event.stopPropagation();
    const tab = existingTab ?? openBlankTab();
    setDownloadError('');
    setDownloadingId(doc.id);
    try {
      const { data } = await api.get(`/documents/${doc.id}/download`);
      if (tab) tab.location.href = data.url;
    } catch (err) {
      tab?.close();
      setDownloadError(err.response?.data?.error || 'Impossible de télécharger ce fichier.');
    } finally {
      setDownloadingId(null);
    }
  }

  // Prompt F2 : ouvre le document dans l'interface Google Drive (webViewLink) au lieu de le
  // télécharger — repli silencieux sur le téléchargement habituel si le lien Drive échoue pour
  // une raison quelconque, jamais un cul-de-sac pour l'utilisateur. Le même onglet (déjà ouvert
  // avant tout await, pour Safari iOS — voir openInNewTab.js) est réutilisé pour le repli, au
  // lieu d'en ouvrir un second.
  async function handleOpenInDrive(event, doc) {
    event.stopPropagation();
    const tab = openBlankTab();
    setDownloadError('');
    setOpeningDriveId(doc.id);
    try {
      const { data } = await api.get(`/documents/${doc.id}/drive-view-link`);
      if (tab) tab.location.href = data.url;
    } catch {
      await handleDownload(event, doc, tab);
    } finally {
      setOpeningDriveId(null);
    }
  }

  function handleCreated(newDocument) {
    setDocuments((prev) => [newDocument, ...prev]);
    setIsModalOpen(false);
  }

  // Toujours trié par numéro croissant, indépendamment du tri affiché à l'écran — cohérence
  // demandée entre CSV et PDF, quel que soit l'ordre choisi sur la page au moment de l'export.
  function sortByNumber(docs) {
    return [...docs].sort((a, b) => String(a.number ?? '').localeCompare(String(b.number ?? ''), 'fr', { numeric: true }));
  }

  function handleExportCsv(scopeIds) {
    const scoped = scopeIds ? filteredDocuments.filter((doc) => scopeIds.includes(doc.id)) : filteredDocuments;
    const source = sortByNumber(scoped);
    const headers = ['Numéro', 'Titre', 'Description', 'Catégorie', 'Version', 'Statut', 'Prochaine révision', 'Créé le', 'Commentaire dernière version'];
    const rows = source.map((doc) => [
      doc.number,
      doc.title,
      doc.description || '',
      doc.category?.name || '',
      doc.version,
      STATUS_LABELS[doc.status] || doc.status,
      formatDate(doc.review_date),
      formatDate(doc.created_at),
      doc.latest_version_comment || '',
    ]);
    const countLabel = `${source.length} document${source.length > 1 ? 's' : ''}`;
    const filterParts = [];
    if (statusFilter) filterParts.push(`Statut : ${STATUS_LABELS[statusFilter] || statusFilter}`);
    if (categoryFilter) filterParts.push(`Catégorie : ${source.find((d) => d.category_id === categoryFilter)?.category?.name || categoryFilter}`);
    exportToCsv(`documents-${new Date().toISOString().slice(0, 10)}.csv`, 'Documents', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: [countLabel, ...filterParts].join(' · '),
    });
  }

  async function handleExportPdf(scopeIds) {
    const scoped = scopeIds ? filteredDocuments.filter((doc) => scopeIds.includes(doc.id)) : filteredDocuments;
    const source = sortByNumber(scoped);
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'number', label: 'Numéro', width: 0.09 },
        { key: 'title', label: 'Titre', width: 0.18 },
        { key: 'description', label: 'Description', width: 0.18 },
        { key: 'category', label: 'Catégorie', width: 0.11 },
        { key: 'version', label: 'Version', width: 0.06 },
        { key: 'status', label: 'Statut', width: 0.09 },
        { key: 'review_date', label: 'Proch. révision', width: 0.11 },
        { key: 'latest_version_comment', label: 'Commentaire dernière version', width: 0.18 },
      ];
      const rows = source.map((doc) => ({
        number: doc.number,
        title: doc.title,
        description: doc.description || '',
        category: doc.category?.name || '',
        version: doc.version,
        status: STATUS_LABELS[doc.status] || doc.status,
        review_date: formatDate(doc.review_date),
        latest_version_comment: doc.latest_version_comment || '',
      }));
      const countLabel = `${source.length} document${source.length > 1 ? 's' : ''}`;
      const filterParts = [];
      if (statusFilter) filterParts.push(`Statut : ${STATUS_LABELS[statusFilter] || statusFilter}`);
      if (categoryFilter) filterParts.push(`Catégorie : ${source.find((d) => d.category_id === categoryFilter)?.category?.name || categoryFilter}`);
      await exportToPdf(`documents-${new Date().toISOString().slice(0, 10)}.pdf`, 'Documents', columns, rows, {
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
    const scoped = scopeIds ? filteredDocuments.filter((doc) => scopeIds.includes(doc.id)) : filteredDocuments;
    const source = sortByNumber(scoped);
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'number', label: 'Numéro' },
        { key: 'title', label: 'Titre' },
        { key: 'description', label: 'Description' },
        { key: 'category', label: 'Catégorie' },
        { key: 'version', label: 'Version' },
        { key: 'status', label: 'Statut' },
        { key: 'review_date', label: 'Proch. révision' },
        { key: 'latest_version_comment', label: 'Commentaire dernière version' },
      ];
      const rows = source.map((doc) => ({
        number: doc.number,
        title: doc.title,
        description: doc.description || '',
        category: doc.category?.name || '',
        version: doc.version,
        status: STATUS_LABELS[doc.status] || doc.status,
        review_date: formatDate(doc.review_date),
        latest_version_comment: doc.latest_version_comment || '',
      }));
      const countLabel = `${source.length} document${source.length > 1 ? 's' : ''}`;
      const filterParts = [];
      if (statusFilter) filterParts.push(`Statut : ${STATUS_LABELS[statusFilter] || statusFilter}`);
      if (categoryFilter) filterParts.push(`Catégorie : ${source.find((d) => d.category_id === categoryFilter)?.category?.name || categoryFilter}`);
      await exportToXlsx(`documents-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Documents', columns, rows, {
        subtitle: [countLabel, ...filterParts].join(' · '),
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const scoped = scopeIds ? filteredDocuments.filter((doc) => scopeIds.includes(doc.id)) : filteredDocuments;
    const source = sortByNumber(scoped);
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'number', label: 'Numéro' },
        { key: 'title', label: 'Titre' },
        { key: 'description', label: 'Description' },
        { key: 'category', label: 'Catégorie' },
        { key: 'version', label: 'Version' },
        { key: 'status', label: 'Statut' },
        { key: 'review_date', label: 'Proch. révision' },
        { key: 'latest_version_comment', label: 'Commentaire dernière version' },
      ];
      const rows = source.map((doc) => ({
        number: doc.number,
        title: doc.title,
        description: doc.description || '',
        category: doc.category?.name || '',
        version: doc.version,
        status: STATUS_LABELS[doc.status] || doc.status,
        review_date: formatDate(doc.review_date),
        latest_version_comment: doc.latest_version_comment || '',
      }));
      const countLabel = `${source.length} document${source.length > 1 ? 's' : ''}`;
      const filterParts = [];
      if (statusFilter) filterParts.push(`Statut : ${STATUS_LABELS[statusFilter] || statusFilter}`);
      if (categoryFilter) filterParts.push(`Catégorie : ${source.find((d) => d.category_id === categoryFilter)?.category?.name || categoryFilter}`);
      await exportToDrive('DOC', 'Documents', columns, rows, {
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
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Documents</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={filteredDocuments.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || filteredDocuments.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => handleExportXlsx()}
            disabled={exportingXlsx || filteredDocuments.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            {exportingXlsx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter Excel
          </button>
          {tenant?.storage_provider === 'google_drive' && (
            <button
              type="button"
              onClick={() => handleExportDrive()}
              disabled={exportingDrive || filteredDocuments.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              {exportingDrive ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
              Enregistrer sur Drive
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:flex-none"
          >
            <Upload size={18} />
            Importer
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouveau document
          </button>
        </div>
      </div>
      {tenant?.storage_provider === 'google_drive' && (
        <p className="mt-2 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <HardDrive size={16} className="shrink-0" />
          Les documents de votre entreprise sont stockés sur son compte Google Drive.
        </p>
      )}
      {exportPdfError && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}
      {driveSuccess && (
        <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}
      {downloadError && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{downloadError}</p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans le titre, la description ou le contenu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-9 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          {searching && (
            <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <SortSelect
          options={DOCUMENT_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {!isSearchActive && (
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
      )}

      {canManage && (
        <SelectAllToggle ids={sortedDocuments.map((doc) => doc.id)} selectedIds={selectedIds} onChange={setSelectedIds} />
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

      {(error || searchError) && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error || searchError}
        </p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          {isSearchActive
            ? `Aucun résultat pour « ${search.trim()} ».`
            : 'Aucun document ne correspond à ces critères.'}
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {docGroups.map((group) => (
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
                    <span className="font-normal text-slate-400">({group.docs.length})</span>
                  </button>
                )}
                {(!isFolderView || expandedFolders.has(group.key)) && (
                  <div className={`space-y-3 ${isFolderView ? 'mt-2' : ''}`}>
                    {group.docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {canManage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(doc.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(doc.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{doc.title}</p>
                      <p className="text-sm text-slate-500">
                        {doc.number} · v{doc.version}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {doc.file_path && (
                      <StorageProvenanceIcon doc={doc} onOpenInDrive={handleOpenInDrive} opening={openingDriveId === doc.id} />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, doc)}
                      disabled={!doc.file_path || downloadingId === doc.id}
                      aria-label="Télécharger"
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                    >
                      {downloadingId === doc.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CategoryBadge category={doc.category} />
                  <StatusBadge status={doc.status} />
                  <MatchLocationBadge location={doc.match_location} />
                </div>
                {doc.review_date && (
                  <p className="mt-2 text-xs text-slate-500">Prochaine révision : {formatDate(doc.review_date)}</p>
                )}
                {canManage && (
                  <select
                    value={doc.category_id || ''}
                    disabled={updatingCategoryId === doc.id}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleCategoryChange(e, doc)}
                    className="mt-3 w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Aucune catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
                <SearchSnippet snippet={doc.snippet} />
              </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {canManage && <th className="w-8 px-4 py-3" />}
                  <SortableTh label="Numéro" sortKey="number" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Titre" sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Catégorie" sortKey="category" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Version" sortKey="version" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Statut" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTh label="Prochaine révision" sortKey="review_date" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docGroups.map((group) => (
                  <Fragment key={group.key}>
                    {isFolderView && (
                      <tr className="cursor-pointer bg-slate-50 hover:bg-slate-100" onClick={() => toggleFolder(group.key)}>
                        <td colSpan={canManage ? 8 : 7} className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                            {group.category ? group.category.name : 'Sans dossier'}
                            <span className="font-normal text-slate-400">({group.docs.length})</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(!isFolderView || expandedFolders.has(group.key)) &&
                      group.docs.map((doc) => (
                  <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} className="cursor-pointer hover:bg-slate-50">
                    {canManage && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-slate-800">{doc.number}</td>
                    <td className="max-w-sm px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-2">
                        {doc.title}
                        <MatchLocationBadge location={doc.match_location} />
                      </div>
                      <SearchSnippet snippet={doc.snippet} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={doc.category} />
                        {canManage && (
                          <select
                            value={doc.category_id || ''}
                            disabled={updatingCategoryId === doc.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCategoryChange(e, doc)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Aucune catégorie</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{doc.version}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(doc.review_date) || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.file_path && (
                          <StorageProvenanceIcon doc={doc} onOpenInDrive={handleOpenInDrive} opening={openingDriveId === doc.id} />
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, doc)}
                          disabled={!doc.file_path || downloadingId === doc.id}
                          aria-label="Télécharger"
                          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                        >
                          {downloadingId === doc.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <DocumentModal categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}

      {isImportModalOpen && (
        <ImportDocumentsModal onClose={() => setIsImportModalOpen(false)} onImported={loadData} />
      )}

      {isBulkMoveModalOpen && (
        <DocumentBulkMoveModal
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
