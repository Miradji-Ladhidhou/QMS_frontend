import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import DecisionModal from '../components/DecisionModal.jsx';
import SortSelect from '../components/SortSelect.jsx';

const APPROVAL_SORT_OPTIONS = [
  { key: 'title', label: 'titre du document' },
  { key: 'number', label: 'numéro' },
];

function getApprovalSortValue(item, key) {
  return item.workflow.document[key];
}

export default function MyApprovals() {
  const currentUser = useCurrentUser();
  const canValidateProcedures = isManagerRole(currentUser?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [pendingProcedures, setPendingProcedures] = useState([]);
  const [proceduresError, setProceduresError] = useState('');
  const { sorted: sortedItems, sortKey, direction, setSortKey, toggleSort } = useSort(
    items,
    getApprovalSortValue,
    'title',
    'asc'
  );

  async function loadPending() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/workflows/mine');
      setItems(data);
    } catch {
      setError('Impossible de charger vos approbations en attente.');
    } finally {
      setLoading(false);
    }
  }

  // Pas d'approbateur désigné à l'avance sur les procédures (n'importe quel admin/manager peut
  // valider, voir procedures.js#validate) : contrairement à /workflows/mine, cette liste n'est
  // donc pas filtrée "assignée à moi" — juste réservée aux rôles qui peuvent effectivement agir.
  async function loadPendingProcedures() {
    setProceduresError('');
    try {
      const { data } = await api.get('/procedures/pending-validations');
      setPendingProcedures(data);
    } catch {
      setProceduresError('Impossible de charger les procédures en attente de validation.');
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    if (canValidateProcedures) loadPendingProcedures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canValidateProcedures]);

  function handleDecided() {
    setDecisionTarget(null);
    loadPending();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Mes approbations</h1>

      {items.length > 0 && (
        <div className="mt-4">
          <SortSelect
            options={APPROVAL_SORT_OPTIONS}
            sortKey={sortKey}
            direction={direction}
            onChangeKey={setSortKey}
            onToggleDirection={() => toggleSort(sortKey)}
          />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune approbation en attente pour l'instant.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link to={`/documents/${item.workflow.document.id}`} className="font-medium text-slate-900 hover:text-primary">
                  {item.workflow.document.title}
                </Link>
                <p className="text-sm text-slate-500">
                  {item.workflow.document.number} · v{item.workflow.document.version}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionTarget({ workflowId: item.workflow.id, decision: 'rejected' })}
                  className="flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <XCircle size={16} />
                  Rejeter
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionTarget({ workflowId: item.workflow.id, decision: 'approved' })}
                  className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  <Check size={16} />
                  Approuver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canValidateProcedures && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-slate-900">Procédures</h2>

          {proceduresError && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {proceduresError}
            </p>
          )}

          {pendingProcedures.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune procédure en attente de validation.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingProcedures.map((item) => (
                <Link
                  key={item.id}
                  to={`/procedures/${item.procedure.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.procedure.title}</p>
                    <p className="text-sm text-slate-500">
                      {item.procedure.number} · v{item.version}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {decisionTarget && (
        <DecisionModal
          workflowId={decisionTarget.workflowId}
          decision={decisionTarget.decision}
          onClose={() => setDecisionTarget(null)}
          onDecided={handleDecided}
        />
      )}
    </div>
  );
}
