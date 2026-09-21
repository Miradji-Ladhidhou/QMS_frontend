import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import { EVALUATION_DECISION_LABELS, EVALUATION_DECISION_STYLES } from '../../lib/supplierStatus.js';
import { formatIsoDate, formatScore } from '../../lib/supplierPolicy.js';

const FILTERS = [
  { key: 'overdue', label: 'Évaluations en retard', count: (c) => c.overdue, tone: 'red' },
  { key: 'never', label: 'Jamais évalués', count: (c) => c.never_evaluated, tone: 'amber' },
  { key: 'watch', label: 'Sous surveillance', count: (c) => c.under_watch, tone: 'amber' },
  { key: 'long_watch', label: 'Surveillance > 6 mois', count: (c) => c.long_watch, tone: 'red' },
  { key: 'documents', label: 'Certificats à renouveler', count: (c) => c.expired_documents + c.expiring_documents, tone: 'red' },
];
const TONES = { red: 'border-red-200 bg-red-50 text-red-800', amber: 'border-amber-200 bg-amber-50 text-amber-900' };

// Tableau de synthèse des fournisseurs : ce qui demande une action (évaluations en retard, fournisseurs jamais évalués,
// surveillance qui dure, certificats à renouveler) — chaque compteur filtre la liste — et le classement par note.
export default function SupplierSummaryPanel({ summary, activeFilter, onFilter }) {
  const [showRanking, setShowRanking] = useState(false);
  if (!summary || summary.suppliers.length === 0) return null;
  const { counts } = summary;
  const alerts = FILTERS.filter((filter) => filter.count(counts) > 0);
  const criticalNever = counts.critical_never_evaluated;

  const ranked = summary.suppliers
    .filter((supplier) => supplier.status === 'active' && supplier.latest)
    .sort((a, b) => b.latest.score - a.latest.score || a.name.localeCompare(b.name, 'fr'));

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Synthèse</h2>
        <p className="text-xs text-slate-500">
          {counts.active} fournisseur{counts.active > 1 ? 's' : ''} actif{counts.active > 1 ? 's' : ''} · {counts.evaluated} évalué{counts.evaluated > 1 ? 's' : ''}
        </p>
      </div>

      {alerts.length === 0 ? (
        <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Rien à signaler : évaluations à jour, certificats valides.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {alerts.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => onFilter(activeFilter === filter.key ? null : filter.key)}
              aria-pressed={activeFilter === filter.key}
              className={`min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-medium ${TONES[filter.tone]} ${activeFilter === filter.key ? 'ring-2 ring-primary' : ''}`}
            >
              <strong>{filter.count(counts)}</strong> {filter.label.toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {criticalNever > 0 && (
        <p className="mt-2 flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {criticalNever} fournisseur{criticalNever > 1 ? 's' : ''} de criticité élevée ou critique jamais évalué{criticalNever > 1 ? 's' : ''}.
        </p>
      )}

      {ranked.length > 0 && (
        <>
          <button type="button" onClick={() => setShowRanking((value) => !value)} aria-expanded={showRanking} className="mt-3 flex min-h-[40px] w-full items-center justify-between gap-2 border-t border-slate-100 pt-3 text-left text-sm font-medium text-slate-700">
            Classement par note ({ranked.length})
            <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${showRanking ? 'rotate-180' : ''}`} />
          </button>
          {showRanking && (
            <ol className="mt-1 space-y-1.5">
              {ranked.map((supplier, index) => (
                <li key={supplier.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="w-5 shrink-0 text-xs font-semibold text-slate-400">{index + 1}</span>
                  <Link to={`/suppliers/${supplier.id}`} className="min-w-0 flex-1 break-words py-1 font-medium text-slate-900 hover:text-primary">
                    {supplier.name}
                    <span className="block text-xs font-normal text-slate-500">Évalué le {formatIsoDate(supplier.latest.date)}</span>
                  </Link>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-900">
                      {formatScore(supplier.latest.score)}
                      {supplier.trend > 0 && <TrendingUp size={14} className="text-emerald-600" aria-label="En progression" />}
                      {supplier.trend < 0 && <TrendingDown size={14} className="text-red-600" aria-label="En baisse" />}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${EVALUATION_DECISION_STYLES[supplier.latest.decision]}`}>{EVALUATION_DECISION_LABELS[supplier.latest.decision]}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
