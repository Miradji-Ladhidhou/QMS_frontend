import { useEffect, useState } from 'react';
import { AlertTriangle, Save, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api.js';

// Seuil d'acceptabilité du risque résiduel (score = probabilité × gravité, de 2 à 25) : à partir de ce
// score, le risque est « inacceptable » — alerte ici, et une CAPA liée est exigée avant de le passer
// traité / accepté / clôturé. Réglage de l'entreprise, modifiable par l'admin. `risks` = liste affichée
// X : filtre « inacceptables sans CAPA ».
export default function RiskThresholdBanner({ risks, isAdmin, refreshKey, onlyNeedsCapa, onToggleFilter, onChanged }) {
  const [threshold, setThreshold] = useState(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/risks/settings')
      .then(({ data }) => {
        setThreshold(data.unacceptable_score);
        setDraft(String(data.unacceptable_score));
      })
      .catch(() => setThreshold(null));
  }, [refreshKey]);

  async function save(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.patch('/risks/settings', { unacceptable_score: Number(draft) });
      setThreshold(data.unacceptable_score);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le seuil.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onChanged?.();
  }

  if (threshold === null) return null;

  const unacceptable = risks.filter((risk) => risk.is_unacceptable);
  const needsCapa = unacceptable.filter((risk) => risk.needs_capa);
  const alert = needsCapa.length > 0;

  return (
    <div className={`mt-4 rounded-lg border px-3 py-2.5 text-sm ${alert ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-700'}`}>
      <div className="flex items-start gap-2.5">
        {alert ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <ShieldCheck size={16} className="mt-0.5 shrink-0" />}
        <div className="flex min-w-0 flex-1 flex-col gap-x-3 sm:flex-row sm:items-center">
          <span className="min-w-0 flex-1">
            {alert ? (
              <>
                <strong>{needsCapa.length}</strong> risque{needsCapa.length > 1 ? 's' : ''} inacceptable{needsCapa.length > 1 ? 's' : ''} sans CAPA (score ≥ {threshold}).
              </>
            ) : unacceptable.length > 0 ? (
              <>
                {unacceptable.length} risque{unacceptable.length > 1 ? 's' : ''} inacceptable{unacceptable.length > 1 ? 's' : ''} (score ≥ {threshold}), tous pris en charge par une CAPA.
              </>
            ) : (
              <>Aucun risque inacceptable (seuil : score ≥ {threshold}).</>
            )}
          </span>
          <span className="flex flex-wrap items-center">
            {alert && (
              <button
                type="button"
                onClick={onToggleFilter}
                className="-ml-1 flex min-h-[40px] items-center px-1 text-xs font-medium underline sm:min-h-0 sm:mr-3"
              >
                {onlyNeedsCapa ? 'Voir tous les risques' : 'Voir ceux à traiter'}
              </button>
            )}
            {isAdmin && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="-ml-1 flex min-h-[40px] items-center px-1 text-xs font-medium underline sm:min-h-0"
              >
                Modifier le seuil
              </button>
            )}
          </span>
        </div>
      </div>
      {isAdmin && editing && (
        <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2 text-slate-800">
          <label className="text-xs" htmlFor="risk-threshold">
            Inacceptable à partir du score
          </label>
          <input
            id="risk-threshold"
            type="number"
            min="2"
            max="25"
            inputMode="numeric"
            required
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" disabled={saving} className="flex min-h-[40px] items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60">
            <Save size={12} />
            Enregistrer
          </button>
          <button type="button" onClick={() => setEditing(false)} className="min-h-[40px] px-2 text-xs underline">
            Annuler
          </button>
          <span className="w-full text-xs text-slate-500">
            Score = probabilité × gravité (1 à 25). Au-dessus du seuil, une CAPA liée est exigée avant de passer un risque traité, accepté ou clôturé.
          </span>
          {error && <span className="w-full text-xs text-red-700">{error}</span>}
        </form>
      )}
    </div>
  );
}
