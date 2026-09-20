import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { IMPACT_LABELS, LIKELIHOOD_LABELS } from '../../lib/riskStatus.js';
import { NEXT_REVIEW_OPTIONS, addMonthsIso, formatIsoDate } from '../../lib/riskReview.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// « Marquer revu » : on a réexaminé ce risque. La cotation peut rester telle quelle (revu, inchangé) ou être
// ajustée ; la prochaine date de revue est fixée. Une ligne « revu le … par … » est ajoutée à l'historique.
export default function RiskMarkReviewedModal({ risk, onClose, onReviewed }) {
  const [likelihood, setLikelihood] = useState(String(risk.likelihood));
  const [impact, setImpact] = useState(String(risk.impact));
  const [nextMonths, setNextMonths] = useState(12);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const body = { next_review_date: addMonthsIso(nextMonths) };
    if (Number(likelihood) !== risk.likelihood) body.likelihood = Number(likelihood);
    if (Number(impact) !== risk.impact) body.impact = Number(impact);
    if (reason.trim()) body.reason = reason.trim();

    let response;
    try {
      response = await api.post(`/risks/${risk.id}/review`, body);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la revue.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onReviewed(response.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Marquer ce risque revu</h2>
            <p className="break-words text-sm text-slate-500">{risk.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 shrink-0 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Vous avez réexaminé ce risque. Laissez la cotation telle quelle s'il n'a pas changé : la revue est tout de même tracée dans l'historique.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Probabilité</label>
              <select value={likelihood} onChange={(e) => setLikelihood(e.target.value)} className={FIELD_CLASS}>
                {Object.entries(LIKELIHOOD_LABELS).map(([score, text]) => (
                  <option key={score} value={score}>
                    {score} — {text}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
              <select value={impact} onChange={(e) => setImpact(e.target.value)} className={FIELD_CLASS}>
                {Object.entries(IMPACT_LABELS).map(([score, text]) => (
                  <option key={score} value={score}>
                    {score} — {text}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prochaine revue</label>
            <select value={nextMonths} onChange={(e) => setNextMonths(Number(e.target.value))} className={FIELD_CLASS}>
              {NEXT_REVIEW_OPTIONS.map((option) => (
                <option key={option.months} value={option.months}>
                  {option.label} ({formatIsoDate(addMonthsIso(option.months))})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motif (facultatif)</label>
            <input type="text" maxLength={500} placeholder="Revue annuelle" value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_CLASS} />
          </div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer la revue'}
          </button>
        </form>
      </div>
    </div>
  );
}
