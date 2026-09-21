import { Wand2 } from 'lucide-react';
import { formatInterval, suggestIntervalHours, suggestLimits } from '../../lib/haccpMonitoring.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Limites chiffrées et rappel de relevé d'un CCP. Avec au moins une borne, chaque relevé reçoit un verdict
// AUTOMATIQUE (dans / hors limites) et la surveillance affiche une courbe ; sans borne, le verdict se saisit à la
// main. L'intervalle déclenche le rappel « relevé en retard ». Les propositions se calculent d'après le texte déjà saisi
// (limites critiques, fréquence) mais ne sont appliquées qu'au clic.
export default function CcpLimitsFields({ form, updateField }) {
  const limitsSuggestion = suggestLimits(form.critical_limits);
  const intervalSuggestion = suggestIntervalHours(form.monitoring_frequency);
  const hasLimits = form.limit_min !== '' || form.limit_max !== '';

  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-800">Limites chiffrées et rappel</legend>
      <p className="text-xs text-slate-500">
        Avec une limite chiffrée, chaque relevé est jugé automatiquement (« dans / hors limites ») et une courbe est tracée. Bornes incluses : 4 °C est dans « max 4 ».
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Minimum</label>
          <input type="text" inputMode="decimal" placeholder="—" value={form.limit_min} onChange={(e) => updateField('limit_min', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Maximum</label>
          <input type="text" inputMode="decimal" placeholder="—" value={form.limit_max} onChange={(e) => updateField('limit_max', e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Unité</label>
          <input type="text" maxLength={20} placeholder="°C" value={form.limit_unit} onChange={(e) => updateField('limit_unit', e.target.value)} className={FIELD_CLASS} />
        </div>
      </div>

      {limitsSuggestion && !hasLimits && (
        <button
          type="button"
          onClick={() => {
            updateField('limit_min', limitsSuggestion.min === null ? '' : String(limitsSuggestion.min));
            updateField('limit_max', limitsSuggestion.max === null ? '' : String(limitsSuggestion.max));
            if (limitsSuggestion.unit && !form.limit_unit) updateField('limit_unit', limitsSuggestion.unit);
          }}
          className="flex min-h-[40px] items-center gap-1.5 text-left text-xs font-medium text-primary hover:underline"
        >
          <Wand2 size={13} className="shrink-0" />
          Reprendre depuis « {form.critical_limits.length > 40 ? `${form.critical_limits.slice(0, 40)}…` : form.critical_limits} »
        </button>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Rappel de relevé toutes les… (heures)</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Ex : 12 pour deux fois par jour — vide = pas de rappel"
          value={form.monitoring_interval_hours}
          onChange={(e) => updateField('monitoring_interval_hours', e.target.value)}
          className={FIELD_CLASS}
        />
        {intervalSuggestion && form.monitoring_interval_hours === '' && (
          <button
            type="button"
            onClick={() => updateField('monitoring_interval_hours', String(intervalSuggestion))}
            className="mt-1 flex min-h-[40px] items-center gap-1.5 text-left text-xs font-medium text-primary hover:underline"
          >
            <Wand2 size={13} className="shrink-0" />
            « {form.monitoring_frequency} » → rappel toutes les {formatInterval(intervalSuggestion)}
          </button>
        )}
        <p className="mt-1 text-xs text-slate-400">Le responsable est prévenu (email et notification) quand un relevé est en retard, entre 6 h et 20 h.</p>
      </div>
    </fieldset>
  );
}
