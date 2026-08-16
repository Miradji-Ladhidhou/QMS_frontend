import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import DecisionModal from '../components/DecisionModal.jsx';

export default function MyApprovals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decisionTarget, setDecisionTarget] = useState(null);

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

  useEffect(() => {
    loadPending();
  }, []);

  function handleDecided() {
    setDecisionTarget(null);
    loadPending();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Mes approbations</h1>

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
          {items.map((item) => (
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
