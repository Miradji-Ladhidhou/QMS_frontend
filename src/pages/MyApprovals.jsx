import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Clock3, FileCheck2, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import DecisionModal from '../components/DecisionModal.jsx';
import SortSelect from '../components/SortSelect.jsx';
import PageGuide from '../components/PageGuide.jsx';

const APPROVAL_SORT_OPTIONS = [
  { key: 'title', label: 'titre du document' },
  { key: 'number', label: 'numéro' },
];

function getApprovalSortValue(item, key) {
  return item.workflow.document[key];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function waitingDays(dateStr) {
  if (!dateStr) return null;
  const submittedAt = new Date(dateStr);
  if (Number.isNaN(submittedAt.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - submittedAt.getTime()) / 86_400_000));
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
  const [proceduresLoading, setProceduresLoading] = useState(false);
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
    setProceduresLoading(true);
    setProceduresError('');
    try {
      const { data } = await api.get('/procedures/pending-validations');
      setPendingProcedures(data);
    } catch {
      setProceduresError('Impossible de charger les procédures en attente de validation.');
    } finally {
      setProceduresLoading(false);
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
      <PageGuide id="my-approvals" />

      {!loading && !error && !proceduresLoading && (
        <section aria-label="Résumé de la file d'approbations" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'À traiter', value: items.length + pendingProcedures.length, detail: 'Total des éléments en attente', accent: 'text-primary' },
            { label: 'Documents', value: items.length, detail: 'Approbations qui vous sont assignées', accent: 'text-slate-900' },
            ...(canValidateProcedures
              ? [{ label: 'Procédures', value: pendingProcedures.length, detail: 'À valider par un admin ou manager', accent: 'text-slate-900' }]
              : []),
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className={`mt-1 text-xl font-semibold ${stat.accent}`}>{stat.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{stat.detail}</p>
            </div>
          ))}
        </section>
      )}

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
      ) : !error && items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm font-medium text-slate-700">Aucune approbation de document ne vous attend.</p>
          <p className="mt-1 text-sm text-slate-500">Les documents qui vous seront assignés apparaîtront ici avec les actions à effectuer.</p>
        </div>
      ) : (
        !error && <div className="mt-4 space-y-3">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      <FileCheck2 size={13} />
                      Approbation de document
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.workflow.created_at ? `Soumis le ${formatDate(item.workflow.created_at)}` : 'Soumis pour approbation'}
                    </span>
                    <span className="text-xs text-slate-500">Échéance non définie</span>
                  </div>
                  <Link to={`/documents/${item.workflow.document.id}`} className="font-medium text-slate-900 hover:text-primary">
                    {item.workflow.document.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {item.workflow.document.number} · version {item.workflow.document.version}
                    {waitingDays(item.workflow.created_at) !== null && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <Clock3 size={13} />
                        En attente depuis {waitingDays(item.workflow.created_at)} j
                      </span>
                    )}
                  </p>
                </div>
                <Link
                  to={`/documents/${item.workflow.document.id}`}
                  className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:self-center"
                >
                  Examiner
                  <ChevronRight size={16} />
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Procédures à valider</h2>
            {!proceduresLoading && pendingProcedures.length > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                {pendingProcedures.length} en attente
              </span>
            )}
          </div>

          {proceduresError && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {proceduresError}
            </p>
          )}

          {proceduresLoading ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((key) => (
                <div key={key} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : !proceduresError && pendingProcedures.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">Aucune procédure ne demande votre validation.</p>
              <p className="mt-1 text-sm text-slate-500">Les procédures soumises apparaîtront ici avec leur date de soumission.</p>
            </div>
          ) : !proceduresError ? (
            <div className="mt-4 space-y-3">
              {pendingProcedures.map((item) => (
                <Link
                  key={item.id}
                  to={`/procedures/${item.procedure.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                        <FileCheck2 size={13} />
                        Validation de procédure
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.submitted_at ? `Soumise le ${formatDate(item.submitted_at)}` : 'Soumise pour validation'}
                      </span>
                      <span className="text-xs text-slate-500">Échéance non définie</span>
                    </div>
                    <p className="font-medium text-slate-900">{item.procedure.title}</p>
                    <p className="text-sm text-slate-500">
                      {item.procedure.number} · v{item.version}
                      {waitingDays(item.submitted_at) !== null && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <Clock3 size={13} />
                          En attente depuis {waitingDays(item.submitted_at)} j
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 sm:self-center">
                    Examiner et valider
                    <ChevronRight size={16} />
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
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
