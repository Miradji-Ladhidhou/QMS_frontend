import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { X } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, STATUS_STYLES, formatNumber, formatObjective, formatPeriod, formatValue } from '../../lib/moduleKpis.js';

// Comparaison d'indicateurs côte à côte : une courbe par indicateur (leurs unités diffèrent : jamais superposées), avec
// son objectif en pointillés, et les chiffres clés en dessous.
export default function ComparisonModal({ indicators, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-3xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Comparer {indicators.length} indicateurs</h2>
            <p className="text-sm text-slate-500">Une courbe par indicateur, avec son objectif en pointillés.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 shrink-0 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {indicators.map((indicator) => {
            const data = indicator.series.map((point) => ({ ...point, label: formatPeriod(point.period_date, indicator.frequency) }));
            const color = STATUS_COLORS[indicator.status];
            return (
              <div key={indicator.preset_id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-1">
                  <p className="min-w-0 break-words text-sm font-semibold text-slate-900">{indicator.label}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[indicator.status]}`}>{STATUS_LABELS[indicator.status]}</span>
                </div>
                <div className="mt-2 h-36 w-full">
                  {data.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <XAxis dataKey="period_date" tickFormatter={(value) => formatPeriod(value, indicator.frequency).replace(/ \d{4}$/, '')} tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" minTickGap={16} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={38} domain={['auto', 'auto']} />
                        <Tooltip labelFormatter={(value) => formatPeriod(value, indicator.frequency)} formatter={(value) => [formatValue(value, indicator.unit), 'Valeur']} />
                        {indicator.target !== null && <ReferenceLine y={indicator.target} stroke="#94a3b8" strokeDasharray="5 4" />}
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-300 px-3 text-center text-xs text-slate-500">
                      Historique en construction : la courbe apparaît dès la deuxième période.
                    </p>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-500">Actuel</dt>
                  <dd className="text-right font-semibold text-slate-900">{indicator.latest ? formatValue(indicator.latest.value, indicator.unit) : '—'}</dd>
                  <dt className="text-slate-500">Objectif</dt>
                  <dd className="text-right font-medium text-slate-700">{formatObjective(indicator.target, indicator.target_direction, indicator.unit)}</dd>
                  <dt className="text-slate-500">Période précédente</dt>
                  <dd className="text-right text-slate-700">{indicator.previous ? formatNumber(indicator.previous.value) : '—'}</dd>
                  <dt className="text-slate-500">Même période N-1</dt>
                  <dd className="text-right text-slate-700">{indicator.year_ago ? formatNumber(indicator.year_ago.value) : '—'}</dd>
                  <dt className="text-slate-500">Moyenne 6 précédentes</dt>
                  <dd className="text-right text-slate-700">{indicator.average_6 ? formatNumber(indicator.average_6.value) : '—'}</dd>
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
