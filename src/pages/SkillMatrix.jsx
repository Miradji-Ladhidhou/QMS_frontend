import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Minus, RefreshCw, X as XIcon } from 'lucide-react';
import { api } from '../lib/api.js';
import { TRAINING_STATUS_LABELS } from '../lib/trainingStatus.js';

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

export default function SkillMatrix() {
  const navigate = useNavigate();
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  function findEntry(training, personId) {
    return training.people.find((entry) => entry.person.id === personId);
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

      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Matrice des compétences</h1>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {Object.entries(TRAINING_STATUS_LABELS).map(([status, label]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${CELL_STYLES[status]}`} />
            {label}
          </span>
        ))}
      </div>

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
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Personnel</th>
                {matrix.map((entry) => (
                  <th key={entry.training.id} className="min-w-[140px] px-4 py-3">
                    {entry.training.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((person) => (
                <tr key={person.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 font-medium text-slate-800">
                    {person.full_name}
                    {person.kind === 'employee' && (
                      <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                        Sans compte
                      </span>
                    )}
                  </td>
                  {matrix.map((entry) => {
                    const cell = findEntry(entry, person.id);
                    const status = cell?.status ?? 'never_done';
                    const Icon = CELL_ICONS[status];
                    return (
                      <td key={entry.training.id} className="px-4 py-3">
                        <span
                          title={TRAINING_STATUS_LABELS[status]}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${CELL_STYLES[status]}`}
                        >
                          <Icon size={16} />
                        </span>
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
