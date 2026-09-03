import { useState } from 'react';
import { GitCompare, Loader2, Minus, Pencil, Plus } from 'lucide-react';
import { api } from '../lib/api.js';

const CHANGE_TYPE_STYLES = {
  added: { icon: Plus, className: 'text-emerald-600' },
  removed: { icon: Minus, className: 'text-red-600' },
  modified: { icon: Pencil, className: 'text-amber-600' },
};

const CHANGE_TYPE_LABELS = { added: 'Ajout', removed: 'Suppression', modified: 'Modification' };

// Comparaison IA affichée au validateur pour contextualiser sa décision — ne persiste rien
// (voir POST /:id/versions/:versionId/compare).
export default function ProcedureVersionComparison({ procedureId, versionId }) {
  const [result, setResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare() {
    setError('');
    setComparing(true);
    try {
      const { data } = await api.post(`/procedures/${procedureId}/versions/${versionId}/compare`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de comparer les versions.');
    } finally {
      setComparing(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCompare}
        disabled={comparing}
        className="flex items-center gap-2 rounded-md border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50"
      >
        {comparing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Comparaison en cours...
          </>
        ) : (
          <>
            <GitCompare size={16} />
            Comparer avec la version précédente
          </>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-4">
          <p className="text-sm text-slate-700">{result.summary}</p>

          {result.changes?.length > 0 && (
            <ul className="mt-3 space-y-2">
              {result.changes.map((change, i) => {
                const style = CHANGE_TYPE_STYLES[change.change_type] || CHANGE_TYPE_STYLES.modified;
                const Icon = style.icon;
                return (
                  <li key={i} className={`flex items-start gap-2 text-sm ${style.className}`}>
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{CHANGE_TYPE_LABELS[change.change_type] || change.change_type}</span>
                      {' — '}
                      <span className="text-slate-700">{change.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
