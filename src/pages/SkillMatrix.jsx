import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Download, Loader2, Minus, RefreshCw, X as XIcon } from 'lucide-react';
import { api } from '../lib/api.js';
import { exportToCsv } from '../lib/csvExport.js';
import { TRAINING_STATUS_LABELS } from '../lib/trainingStatus.js';
import { useSort } from '../lib/useSort.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { openBlankTab } from '../lib/openInNewTab.js';
import SortableTh from '../components/SortableTh.jsx';

const CELL_STYLES = {
  up_to_date: 'bg-emerald-100 text-emerald-700',
  due_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  never_done: 'bg-slate-100 text-slate-400',
};

const CELL_ICONS = {
  up_to_date: Check,
  due_soon: RefreshCw,
  expired: XIcon,
  never_done: Minus,
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Date affichée sous chaque pastille : l'échéance de renouvellement quand elle existe (à
// jour/bientôt/expiré s'appuient dessus), sinon la date de réalisation pour une formation
// non récurrente déjà faite (up_to_date sans next_due_date), sinon rien (never_done).
function cellDateLabel(cell) {
  if (cell?.next_due_date) return formatDate(cell.next_due_date);
  if (cell?.last_completed_at) return formatDate(cell.last_completed_at);
  return null;
}

export default function SkillMatrix() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/trainings/matrix');
        setMatrix(data);
      } catch {
        setError('Impossible de charger la matrice des compétences.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // people : comptes utilisateurs ET personnel sans compte (voir trainings.js /matrix),
  // chaque entrée { id, full_name, kind: 'user' | 'employee' }.
  const people = matrix[0]?.people.map((entry) => entry.person) ?? [];
  const { sorted: sortedPeople, sortKey, direction, toggleSort } = useSort(
    people,
    (person, key) => person[key],
    'full_name',
    'asc'
  );

  function findEntry(training, personId) {
    return training.people.find((entry) => entry.person.id === personId);
  }

  function handleExportCsv() {
    const headers = ['Personnel', 'Statut personnel', ...matrix.map((entry) => entry.training.title)];
    const rows = people.map((person) => [
      person.full_name,
      person.kind === 'employee' ? 'Sans compte' : 'Compte',
      ...matrix.map((entry) => {
        const cell = findEntry(entry, person.id);
        const status = cell?.status ?? 'never_done';
        const dateLabel = cellDateLabel(cell);
        return dateLabel ? `${TRAINING_STATUS_LABELS[status]} (${dateLabel})` : TRAINING_STATUS_LABELS[status];
      }),
    ]);
    exportToCsv(`matrice-competences-${new Date().toISOString().slice(0, 10)}.csv`, 'Matrice des compétences', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: `${people.length} personne${people.length > 1 ? 's' : ''}`,
    });
  }

  async function handleExportPdf() {
    const tab = openBlankTab();
    setExportError('');
    setExportingPdf(true);
    try {
      const response = await api.get('/trainings/matrix/pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      if (tab) tab.location.href = url;
    } catch {
      tab?.close();
      setExportError('Impossible d\'exporter la matrice en PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/trainings')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-primary"
      >
        <ArrowLeft size={16} />
        Retour aux formations
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Matrice des compétences</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={people.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || people.length === 0}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            PDF
          </button>
        </div>
      </div>
      {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {Object.entries(TRAINING_STATUS_LABELS).map(([status, label]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${CELL_STYLES[status]}`} />
            {label}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Date affichée sous chaque case : échéance de renouvellement, ou date de réalisation si la formation n'est pas récurrente.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : matrix.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune formation pour construire la matrice.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <SortableTh
                  label="Personnel"
                  sortKey="full_name"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                  className="sticky left-0 z-10 max-w-[110px] bg-slate-50 px-3 py-3 sm:max-w-none sm:px-4"
                />
                {matrix.map((entry) => (
                  <th key={entry.training.id} className="min-w-[110px] whitespace-nowrap px-3 py-3 sm:px-4">
                    {entry.training.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPeople.map((person) => (
                <tr key={person.id}>
                  <td
                    title={person.full_name}
                    className="sticky left-0 z-10 max-w-[110px] truncate bg-white px-3 py-3 font-medium text-slate-800 sm:max-w-none sm:whitespace-nowrap sm:px-4"
                  >
                    {person.full_name}
                    {person.kind === 'employee' && (
                      <span className="ml-1.5 hidden rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">
                        Sans compte
                      </span>
                    )}
                  </td>
                  {matrix.map((entry) => {
                    const cell = findEntry(entry, person.id);
                    const status = cell?.status ?? 'never_done';
                    const Icon = CELL_ICONS[status];
                    const dateLabel = cellDateLabel(cell);
                    return (
                      <td key={entry.training.id} className="px-3 py-3 sm:px-4">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            title={TRAINING_STATUS_LABELS[status]}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${CELL_STYLES[status]}`}
                          >
                            <Icon size={16} />
                          </span>
                          <span className={`whitespace-nowrap text-[11px] ${dateLabel ? 'text-slate-500' : 'text-slate-300'}`}>
                            {dateLabel || '—'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
