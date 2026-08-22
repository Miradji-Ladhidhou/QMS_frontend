import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { exportToCsv } from '../lib/csvExport.js';
import { QQOQCCP_STATUS_LABELS } from '../lib/qqoqccpStatus.js';
import { useSort } from '../lib/useSort.js';
import QqoqccpStatusBadge from '../components/QqoqccpStatusBadge.jsx';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const QQOQCCP_SORT_OPTIONS = [
  { key: 'created_at', label: 'date de création' },
  { key: 'title', label: 'titre' },
  { key: 'status', label: 'statut' },
];

function NewAnalysisModal({ categories, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le state du parent ne doit pas se faire passer pour un échec de l'appel API.
    let response;
    try {
      response = await api.post('/qqoqccp', { title, category_id: categoryId || undefined });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer l'analyse.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle analyse</h2>
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
              autoFocus
              placeholder="Ex : Rupture de stock composant X"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {categories.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : "Créer l'analyse"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Qqoqccp() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    api
      .get('/qqoqccp')
      .then(({ data }) => setAnalyses(data))
      .catch(() => setError('Impossible de charger les analyses QQOQCCP.'))
      .finally(() => setLoading(false));
    api
      .get('/module-categories', { params: { resource_type: 'qqoqccp' } })
      .then(({ data }) => setCategories(data))
      .catch(() => {});
  }, []);

  const { sorted: sortedAnalyses, sortKey, direction, setSortKey, toggleSort } = useSort(
    analyses,
    (analysis, key) => analysis[key],
    'created_at',
    'desc'
  );

  function handleCreated(analysis) {
    setIsModalOpen(false);
    navigate(`/qqoqccp/${analysis.id}`);
  }

  function handleExportCsv() {
    const headers = ['Titre', 'Statut', 'Créée le'];
    const rows = analyses.map((analysis) => [
      analysis.title,
      QQOQCCP_STATUS_LABELS[analysis.status] || analysis.status,
      formatDate(analysis.created_at),
    ]);
    exportToCsv(`qqoqccp-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">QQOQCCP</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={analyses.length === 0}
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
            Nouvelle analyse
          </button>
        </div>
      </div>

      <div className="mt-4">
        <SortSelect
          options={QQOQCCP_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-base font-medium text-slate-700">Aucune analyse QQOQCCP pour l'instant</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Créez votre première analyse pour structurer un problème avec la méthode Qui/Quoi/Où/Quand/Comment/Combien/Pourquoi.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Nouvelle analyse
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              onClick={() => navigate(`/qqoqccp/${analysis.id}`)}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{analysis.title}</p>
                <p className="text-sm text-slate-500">{formatDate(analysis.created_at)}</p>
              </div>
              <QqoqccpStatusBadge status={analysis.status} />
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewAnalysisModal categories={categories} onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
