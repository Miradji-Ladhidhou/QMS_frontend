import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ClipboardCheck, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { useSmartBack } from '../lib/useSmartBack.js';
import { describeDue, MONITORING_STATE_STYLES, MONITORING_STATE_LABELS } from '../lib/haccpMonitoring.js';
import CcpStatusChip from '../components/haccp/CcpStatusChip.jsx';
import ReadingForm from '../components/haccp/ReadingForm.jsx';
import PageGuide from '../components/PageGuide.jsx';

function CcpCard({ item, onSaved }) {
  const [open, setOpen] = useState(item.monitoring_state === 'overdue' || item.monitoring_state === 'due_soon');
  const accent = item.monitoring_state === 'overdue' ? 'border-red-300' : item.monitoring_state === 'due_soon' ? 'border-amber-300' : 'border-slate-200';

  return (
    <li className={`rounded-xl border bg-white shadow-sm ${accent}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex min-h-[56px] w-full items-start gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-slate-900">
            {item.ccp_number ? `${item.ccp_number} — ` : ''}
            {item.hazard_description}
          </p>
          <p className="break-words text-sm text-slate-500">
            {item.plan.title} · {item.step_name}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <CcpStatusChip ccp={item} />
            <span className="text-xs text-slate-500">{describeDue(item)}</span>
          </div>
          {item.last_reading && (
            <p className="mt-1 text-xs text-slate-500">
              Dernier relevé : <span className={item.last_reading.within_limits ? 'text-emerald-700' : 'font-medium text-red-700'}>{item.last_reading.recorded_value}</span> le{' '}
              {new Date(item.last_reading.recorded_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="text-xs text-slate-500">
            Limites critiques : <strong className="font-medium text-slate-700">{item.limits_text || item.critical_limits}</strong>
          </p>
          {item.monitoring_procedure && <p className="mb-3 mt-0.5 break-words text-xs text-slate-500">Comment : {item.monitoring_procedure}</p>}
          <ReadingForm ccp={item} onSaved={() => onSaved()} />
          <Link to={`/haccp/${item.plan.id}`} className="mt-3 inline-flex min-h-[40px] items-center text-xs font-medium text-primary hover:underline">
            Voir le plan et la courbe
          </Link>
        </div>
      )}
    </li>
  );
}

// « Relevés du jour » : la liste de travail des opérateurs — les points critiques des plans actifs, le plus en retard
// d'abord, avec la saisie du relevé et le verdict immédiat. Pensée pour le téléphone, en atelier.
export default function HaccpToday() {
  const goBack = useSmartBack('/haccp');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [onlyMine, setOnlyMine] = useState(null); // null = choix automatique selon les données

  function load() {
    setRefreshing(true);
    api
      .get('/haccp/monitoring-due')
      .then(({ data: result }) => {
        setData(result);
        setError('');
      })
      .catch(() => setError('Impossible de charger les relevés.'))
      .finally(() => setRefreshing(false));
  }

  useEffect(load, []);

  const hasMine = data?.items.some((item) => item.is_mine) || false;
  const mineOnly = onlyMine === null ? hasMine : onlyMine;
  const items = useMemo(() => (data ? data.items.filter((item) => !mineOnly || item.is_mine) : []), [data, mineOnly]);

  return (
    <div>
      <button type="button" onClick={goBack} className="-ml-1 mb-2 flex min-h-[40px] items-center gap-1 px-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Relevés du jour</h1>
        <button type="button" onClick={load} disabled={refreshing} aria-label="Actualiser" className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:min-h-0 sm:py-2">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>
      <PageGuide id="haccpToday" />

      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {!data && !error ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {data.counts.overdue === 0 && data.counts.due_soon === 0 && data.items.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Tous les relevés sont à jour</span>
              )}
              {['overdue', 'due_soon'].map((state) =>
                data.counts[state] > 0 ? (
                  <span key={state} className={`rounded-full px-2.5 py-1 text-xs font-medium ${MONITORING_STATE_STYLES[state]}`}>
                    {data.counts[state]} {MONITORING_STATE_LABELS[state].toLowerCase()}
                  </span>
                ) : null
              )}
              {data.counts.repeated_deviation > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">{data.counts.repeated_deviation} en dérive répétée</span>}
              {hasMine && (
                <button type="button" onClick={() => setOnlyMine(!mineOnly)} className="ml-auto min-h-[40px] rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:py-1.5">
                  {mineOnly ? 'Voir tous les CCP' : 'Voir mes CCP'}
                </button>
              )}
            </div>

            {data.items.length === 0 ? (
              <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center">
                <ClipboardCheck size={28} className="text-slate-300" />
                <p className="mt-2 text-base font-medium text-slate-700">Aucun point critique à relever</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Les CCP apparaissent ici dès qu'un plan HACCP est passé « Actif ».</p>
                <Link to="/haccp" className="mt-4 inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Voir les plans HACCP
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <CcpCard key={item.id} item={item} onSaved={load} />
                ))}
              </ul>
            )}
          </>
        )
      )}
    </div>
  );
}
