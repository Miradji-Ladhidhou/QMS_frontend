import { useState } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api.js';
import { DIRECTION_LABELS, formatNumber, formatObjective } from '../../lib/moduleKpis.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Modification de l'objectif d'un indicateur : sens (« ne pas dépasser » / « atteindre au moins ») et valeur. Deux raccourcis :
// l'objectif suggéré d'après les résultats (meilleure des 6 dernières périodes) et l'objectif par défaut. Le serveur
// enregistre (PATCH /kpis/:id/objective) ; l'état de l'indicateur se recalcule aussitôt.
export default function ObjectiveEditor({ indicator, onSaved, onCancel }) {
  const [direction, setDirection] = useState(indicator.target_direction || indicator.default_direction);
  const [value, setValue] = useState(indicator.target === null || indicator.target === undefined ? '' : String(indicator.target).replace('.', ','));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(body) {
    setError('');
    setSaving(true);
    try {
      await api.patch(`/kpis/${indicator.kpi_id}/objective`, body);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer l'objectif.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === '') return save({ target: null, target_direction: direction });
    const number = Number(trimmed.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(number)) {
      setError('Saisissez un nombre.');
      return;
    }
    return save({ target: number, target_direction: direction });
  }

  const suggestion = indicator.suggested_target;
  const hasChanged = indicator.target_changed;

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Sens de l'objectif">
        {['max', 'min'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setDirection(key)}
            aria-pressed={direction === key}
            className={`min-h-[44px] rounded-md border px-2 text-sm font-medium ${direction === key ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {DIRECTION_LABELS[key]} ({key === 'max' ? '≤' : '≥'})
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Objectif{indicator.unit ? ` (${indicator.unit})` : ''}</label>
        <input type="text" inputMode="decimal" placeholder="Vide = aucun objectif" value={value} onChange={(e) => setValue(e.target.value)} className={FIELD_CLASS} autoFocus />
      </div>

      <div className="flex flex-col gap-1">
        {suggestion !== null && suggestion !== undefined && (
          <button
            type="button"
            onClick={() => setValue(String(suggestion).replace('.', ','))}
            className="flex min-h-[40px] items-start gap-1.5 text-left text-xs font-medium text-primary hover:underline"
          >
            <Lightbulb size={14} className="mt-0.5 shrink-0" />
            Suggestion d'après vos résultats : {formatObjective(suggestion, direction, indicator.unit)} (la meilleure valeur des 6 dernières périodes)
          </button>
        )}
        {hasChanged && (
          <button type="button" onClick={() => save({ reset: true })} disabled={saving} className="flex min-h-[40px] items-center gap-1.5 text-left text-xs font-medium text-slate-600 hover:underline disabled:opacity-60">
            <RotateCcw size={13} className="shrink-0" />
            Revenir à l'objectif par défaut ({formatObjective(indicator.default_target, indicator.default_direction, indicator.unit)})
          </button>
        )}
        {indicator.latest && <p className="text-xs text-slate-400">Valeur actuelle : {formatNumber(indicator.latest.value)}{indicator.unit ? ` ${indicator.unit}` : ''}</p>}
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="min-h-[44px] flex-1 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="min-h-[44px] rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Annuler
        </button>
      </div>
    </form>
  );
}
