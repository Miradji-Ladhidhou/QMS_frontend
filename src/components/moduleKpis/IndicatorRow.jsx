import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Minus, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  COMPARISON_MODES,
  STATUS_LABELS,
  STATUS_STYLES,
  VERDICT_LABELS,
  VERDICT_STYLES,
  compareValues,
  formatDelta,
  formatNumber,
  formatObjective,
  formatPeriod,
  unitFor,
} from '../../lib/moduleKpis.js';
import Sparkline from './Sparkline.jsx';
import ObjectiveEditor from './ObjectiveEditor.jsx';

// Écart chiffré avec la valeur de comparaison choisie (période précédente, N-1 ou moyenne) : flèche, écart, verdict.
function ComparisonBadge({ indicator, mode }) {
  const config = COMPARISON_MODES.find((item) => item.key === mode);
  const baseline = indicator[mode];
  const result = compareValues(indicator.latest, baseline, indicator.target_direction);
  if (!result) return <p className="text-xs text-slate-400">{config.empty}</p>;
  const Icon = result.verdict === 'same' ? Minus : result.delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 text-xs font-medium ${VERDICT_STYLES[result.verdict]}`}>
      <Icon size={14} className="shrink-0" aria-hidden="true" />
      <span>
        {formatDelta(result.delta)}
        {result.percent !== null && result.verdict !== 'same' ? ` (${result.percent > 0 ? '+' : '−'}${Math.abs(result.percent)} %)` : ''} — {VERDICT_LABELS[result.verdict]}
      </span>
      <span className="font-normal text-slate-400">
        {config.short}
        {mode === 'average_6' ? ` (${formatNumber(baseline.value)})` : baseline.period_date ? ` (${formatPeriod(baseline.period_date, indicator.frequency)}: ${formatNumber(baseline.value)})` : ''}
      </span>
    </p>
  );
}

// Un indicateur : suivi (valeur, état, comparaison, objectif modifiable, mini-courbe) ou à suivre (objectif proposé + bouton).
export default function IndicatorRow({ indicator, mode, canManage, compareSelected, compareDisabled, onToggleCompare, onTrack, onUntrack, onRefresh, onObjectiveSaved, busy }) {
  const [editing, setEditing] = useState(false);

  if (!indicator.tracked) {
    return (
      <li className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium text-slate-700">{indicator.label}</p>
            <p className="line-clamp-2 break-words text-xs text-slate-500">{indicator.description}</p>
            <p className="mt-1 text-xs text-slate-400">Objectif proposé : {formatObjective(indicator.default_target, indicator.default_direction, indicator.unit)}</p>
          </div>
          {canManage && (
            <button type="button" onClick={() => onTrack(indicator)} disabled={busy} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-primary px-3 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-60 sm:min-h-[40px]">
              <Plus size={15} />
              {busy ? 'Ajout...' : 'Suivre'}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className={`rounded-lg border bg-white p-3 shadow-sm ${indicator.status === 'bad' ? 'border-red-200' : indicator.status === 'warning' ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="flex items-start gap-2">
        <label className="-m-2 flex shrink-0 cursor-pointer items-start p-2.5">
          <input
            type="checkbox"
            checked={compareSelected}
            disabled={compareDisabled && !compareSelected}
            onChange={() => onToggleCompare(indicator)}
            aria-label={`Comparer ${indicator.label}`}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-40"
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <p className="min-w-0 break-words text-sm font-semibold text-slate-900">{indicator.label}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[indicator.latest ? indicator.status : 'neutral']}`}>
              {indicator.latest ? STATUS_LABELS[indicator.status] : 'En attente de valeur'}
            </span>
          </div>
          <p className="line-clamp-2 break-words text-xs text-slate-500">{indicator.description}</p>

          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              {indicator.latest ? (
                <>
                  <p className="text-2xl font-semibold leading-tight text-slate-900">
                    {formatNumber(indicator.latest.value)}
                    {unitFor(indicator.latest.value, indicator.unit) && <span className="ml-1 text-sm font-medium text-slate-500">{unitFor(indicator.latest.value, indicator.unit)}</span>}
                  </p>
                  <p className="text-xs text-slate-400">{indicator.snapshot ? 'À ce jour' : formatPeriod(indicator.latest.period_date, indicator.frequency)}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Pas encore de valeur — calcul à la prochaine actualisation</p>
              )}
            </div>
            <Sparkline series={indicator.series} target={indicator.target} status={indicator.status} />
          </div>

          {indicator.latest && (
            <div className="mt-1">
              <ComparisonBadge indicator={indicator} mode={mode} />
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-2">
            <p className="text-sm text-slate-700">
              Objectif : <strong>{formatObjective(indicator.target, indicator.target_direction, indicator.unit)}</strong>
              {indicator.target_changed && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">personnalisé</span>}
            </p>
            {canManage && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onRefresh(indicator)} disabled={busy} className="flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Actualiser
                </button>
                <button type="button" onClick={() => setEditing((value) => !value)} aria-expanded={editing} className="flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/5">
                  <Pencil size={13} />
                  Modifier l'objectif
                </button>
                <button type="button" onClick={() => onUntrack(indicator)} aria-label={`Ne plus suivre ${indicator.label}`} className="rounded-md p-3 text-slate-400 hover:bg-slate-100 hover:text-red-600 sm:p-2">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {editing && (
            <ObjectiveEditor
              indicator={indicator}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                onObjectiveSaved();
              }}
            />
          )}
        </div>
      </div>
    </li>
  );
}
