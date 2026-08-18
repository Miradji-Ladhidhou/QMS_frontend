import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { getDocumentPublicUrl } from '../lib/storage.js';
import { STATUS_LABELS } from '../lib/documentStatus.js';
import { exportToCsv } from '../lib/csvExport.js';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import SearchSnippet from '../components/SearchSnippet.jsx';

const SEARCH_DEBOUNCE_MS = 300;

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

function DocumentModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({ number: '', title: '', description: '', category_id: '', review_date: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('number', form.number);
      formData.append('title', form.title);
      if (form.description) formData.append('description', form.description);
      if (form.category_id) formData.append('category_id', form.category_id);
      if (form.review_date) formData.append('review_date', form.review_date);
      if (file) formData.append('file', file);

      const { data } = await api.post('/documents', formData);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le document.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau document</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

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
            <textarea
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de révision</label>
            <input
              type="date"
              value={form.review_date}
              onChange={(e) => updateField('review_date', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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

export default function Documents() {
  const navigate = useNavigate();
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

  function handleDownload(event, doc) {
    event.stopPropagation();
    const url = getDocumentPublicUrl(doc.file_path);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  function handleCreated(newDocument) {
    setDocuments((prev) => [newDocument, ...prev]);
    setIsModalOpen(false);
  }

  function handleExportCsv() {
    const headers = ['Numéro', 'Titre', 'Catégorie', 'Version', 'Statut', 'Date de révision', 'Créé le'];
    const rows = filteredDocuments.map((doc) => [
      doc.number,
      doc.title,
      doc.category?.name || '',
      doc.version,
      STATUS_LABELS[doc.status] || doc.status,
      formatDate(doc.review_date),
      formatDate(doc.created_at),
    ]);
    exportToCsv(`documents-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Documents</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredDocuments.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <Download size={18} />
            Exporter CSV
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
      </div>

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
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{doc.title}</p>
                    <p className="text-sm text-slate-500">
                      {doc.number} · v{doc.version}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, doc)}
                    disabled={!doc.file_path}
                    aria-label="Télécharger"
                    className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CategoryBadge category={doc.category} />
                  <StatusBadge status={doc.status} />
                  <MatchLocationBadge location={doc.match_location} />
                </div>
                <SearchSnippet snippet={doc.snippet} />
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{doc.number}</td>
                    <td className="max-w-sm px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-2">
                        {doc.title}
                        <MatchLocationBadge location={doc.match_location} />
                      </div>
                      <SearchSnippet snippet={doc.snippet} />
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={doc.category} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{doc.version}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => handleDownload(e, doc)}
                        disabled={!doc.file_path}
                        aria-label="Télécharger"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <DocumentModal categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
