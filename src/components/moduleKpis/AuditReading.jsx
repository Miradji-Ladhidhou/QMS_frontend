import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { STATUS_LABELS, STATUS_STYLES, VERDICT_LABELS, VERDICT_STYLES, formatNumber, formatObjective } from '../../lib/moduleKpis.js';

export default function AuditReading({ current, unit, target, direction, status, period, comparisonLabel, comparisonValue, evidenceCount }) {
  const delta = comparisonValue === null || comparisonValue === undefined || current === null || current === undefined ? null : Number(current) - Number(comparisonValue);
  const verdict = delta === null || delta === 0 ? 'same' : direction === 'max' ? (delta < 0 ? 'better' : 'worse') : delta > 0 ? 'better' : 'worse';
  const Icon = verdict === 'same' ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="mt-3 rounded-lg border border-primary/15 bg-primary/[0.03] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Lecture d’audit</p>
      <div className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
        <div><p className="text-slate-500">Période</p><p className="mt-0.5 font-medium text-slate-800">{period || '—'}</p></div>
        <div><p className="text-slate-500">Résultat actuel</p><p className={`mt-0.5 text-base font-semibold ${STATUS_STYLES[status] || 'text-slate-900'}`}>{current === null || current === undefined ? '—' : `${formatNumber(current)}${unit ? ` ${unit}` : ''}`}</p></div>
        <div><p className="text-slate-500">Objectif</p><p className="mt-0.5 font-medium text-slate-800">{formatObjective(target, direction, unit)}</p></div>
        <div><p className="text-slate-500">Comparaison</p><p className="mt-0.5 font-medium text-slate-800">{comparisonValue === null || comparisonValue === undefined ? '—' : `${formatNumber(comparisonValue)}${unit ? ` ${unit}` : ''}`}</p><p className="text-[11px] text-slate-400">{comparisonLabel || 'Aucune comparaison'}</p></div>
        <div><p className="text-slate-500">Conclusion</p><p className={`mt-0.5 flex items-center gap-1 font-semibold ${STATUS_STYLES[status] || 'text-slate-700'}`}>{status ? STATUS_LABELS[status] || status : 'Non évalué'}</p>{delta !== null && <p className={`flex items-center gap-1 text-[11px] ${VERDICT_STYLES[verdict]}`}><Icon size={12} />{VERDICT_LABELS[verdict]} vs période de comparaison</p>}</div>
      </div>
      {evidenceCount !== undefined && <p className="mt-2 border-t border-primary/10 pt-2 text-[11px] text-slate-500">Preuve : {evidenceCount} ligne{evidenceCount > 1 ? 's' : ''} analysée{evidenceCount > 1 ? 's' : ''} et disponible dans le détail ci-dessous.</p>}
    </div>
  );
}
