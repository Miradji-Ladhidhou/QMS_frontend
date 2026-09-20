import { useEffect, useState } from 'react';
import { ChevronDown, TrendingDown } from 'lucide-react';
import { api } from '../../lib/api.js';
import { describeOffTargetSeries } from '../../lib/riskKpiSuggestion.js';

// « Ce KPI est hors objectif : créer un risque ? » — les KPI dont une courbe rate son objectif et qu'aucun
// risque ne couvre encore (un risque lié à un KPI le retire de cette liste). Réservé à admin/manager.
export default function RiskKpiSuggestions({ refreshKey, onCreate }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .get('/risks/suggestions/kpis')
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]));
  }, [refreshKey]);

  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <TrendingDown size={16} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <strong>{items.length}</strong> KPI hors objectif sans risque associé
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="space-y-2 border-t border-amber-200 px-3 py-3">
          {items.map((item) => (
            <li key={item.kpi_id} className="flex flex-col gap-2 rounded-md bg-white/70 p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium text-slate-900">{item.name}</p>
                {describeOffTargetSeries(item).map((line) => (
                  <p key={line} className="break-words text-xs text-slate-600">
                    {line}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onCreate(item)}
                className="min-h-[40px] shrink-0 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                Créer un risque
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
