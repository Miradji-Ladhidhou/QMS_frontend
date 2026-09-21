import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { parseNumber, previewVerdict } from '../../lib/haccpMonitoring.js';
import AutoTextarea from '../AutoTextarea.jsx';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Saisie d'un relevé de surveillance, pensée pour le terrain (gros champs, verdict immédiat). Avec des limites
// chiffrées : on saisit la valeur, le verdict (dans / hors limites) s'affiche en direct et le serveur le confirme.
// Sans limites : on saisit ce qu'on a constaté et on répond « Conforme » ou « Non conforme ». Une dérive exige
// l'action corrective immédiate (principe 5 HACCP). `ccp` : { id, limits, limits_text, critical_limits }.
export default function ReadingForm({ ccp, onSaved }) {
  const limits = ccp.limits;
  const [value, setValue] = useState('');
  const [manualVerdict, setManualVerdict] = useState(null); // true | false | null (sans limites chiffrées)
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(null);

  const numericVerdict = limits ? previewVerdict(value, limits) : null;
  const verdict = limits ? numericVerdict : manualVerdict;
  const isDrift = verdict === false;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (limits && parseNumber(value) === null) {
      setError(`Saisissez une valeur numérique${limits.unit ? ` (en ${limits.unit})` : ''}.`);
      return;
    }
    if (!limits && manualVerdict === null) {
      setError('Indiquez si le relevé est conforme ou non.');
      return;
    }
    setSubmitting(true);
    let response;
    try {
      response = await api.post(`/haccp/ccps/${ccp.id}/monitoring-logs`, {
        ...(limits ? { numeric_value: parseNumber(value) } : { recorded_value: value.trim(), within_limits: manualVerdict }),
        corrective_action_taken: isDrift ? action.trim() || undefined : undefined,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer ce relevé.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setSaved(response.data);
    setValue('');
    setManualVerdict(null);
    setAction('');
    onSaved(response.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {limits ? `Valeur relevée${limits.unit ? ` (${limits.unit})` : ''}` : 'Constat'}
        </label>
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            required
            inputMode={limits ? 'decimal' : 'text'}
            autoComplete="off"
            placeholder={limits ? (ccp.limits_text ? `Limites : ${ccp.limits_text}` : '') : ccp.critical_limits}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(null);
            }}
            className={`${FIELD_CLASS} ${limits ? 'text-2xl font-semibold' : ''}`}
          />
          {limits && limits.unit && <span className="flex items-center rounded-md bg-slate-100 px-3 text-lg font-medium text-slate-600">{limits.unit}</span>}
        </div>
      </div>

      {limits ? (
        value !== '' && (
          <p
            role="status"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              numericVerdict === null ? 'bg-slate-100 text-slate-500' : numericVerdict ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {numericVerdict === null ? (
              'Saisissez un nombre.'
            ) : numericVerdict ? (
              <>
                <CheckCircle2 size={16} /> Dans les limites
              </>
            ) : (
              <>
                <XCircle size={16} /> Hors limites — action corrective obligatoire
              </>
            )}
          </p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setManualVerdict(true)}
            aria-pressed={manualVerdict === true}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-md border text-sm font-medium ${manualVerdict === true ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <CheckCircle2 size={16} /> Conforme
          </button>
          <button
            type="button"
            onClick={() => setManualVerdict(false)}
            aria-pressed={manualVerdict === false}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-md border text-sm font-medium ${manualVerdict === false ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <XCircle size={16} /> Non conforme
          </button>
        </div>
      )}

      {isDrift && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Action corrective immédiate</label>
          <AutoTextarea required rows={2} placeholder="Ex : lot mis en quarantaine, réglage du groupe froid…" value={action} onChange={(e) => setAction(e.target.value)} className={FIELD_CLASS} />
        </div>
      )}

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {saved && (
        <div role="status" className={`rounded-md border px-3 py-2 text-sm ${saved.within_limits ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <p className="flex items-center gap-2 font-medium">
            {saved.within_limits ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            Relevé enregistré : {saved.recorded_value} — {saved.within_limits ? 'conforme' : 'hors limites'}
          </p>
          {saved.repeated_deviation && (
            <p className="mt-1 flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {saved.repeated_deviation.count} dérives en 7 jours sur ce point critique : le responsable est prévenu, une CAPA ou un risque est à ouvrir.
            </p>
          )}
        </div>
      )}

      <button type="submit" disabled={submitting} className="min-h-[48px] w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
        {submitting ? 'Enregistrement...' : 'Enregistrer le relevé'}
      </button>
    </form>
  );
}
