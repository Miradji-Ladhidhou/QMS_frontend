import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { IMPACT_LABELS, LIKELIHOOD_LABELS, RISK_LEVEL_LABELS, RISK_LEVEL_STYLES, riskLevel } from '../../lib/riskStatus.js';
import { NEXT_REVIEW_OPTIONS, REVIEW_STATE_STYLES, addMonthsIso, describeReviewDate, formatIsoDate } from '../../lib/riskReview.js';

const FIELD_CLASS =
  'w-full rounded-md border border-slate-300 px-2 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:py-2 sm:text-sm';

function ScoreSelect({ label, value, options, onChange }) {
  return (
    <label className="block min-w-0 flex-1 text-xs font-medium text-slate-500">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD_CLASS} mt-0.5 text-slate-900`}>
        {Object.entries(options).map(([score, text]) => (
          <option key={score} value={score}>
            {score} — {text}
          </option>
        ))}
      </select>
    </label>
  );
}

// Revue en lot : les risques dont la revue est dépassée, proche (trimestre à venir) ou jamais planifiée.
// On coche ceux qu'on a passés en revue, on ajuste la cotation au besoin, on choisit la prochaine date de
// revue et on valide d'un coup : chaque risque garde sa trace « revu le … par … » et une ligne d'historique.
export default function RiskReviewModal({ onClose, onReviewed }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState({}); // id -> { selected, likelihood, impact }
  const [nextMonths, setNextMonths] = useState(12);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get('/risks/review-queue')
      .then(({ data }) => {
        setItems(data.items);
        setRows(Object.fromEntries(data.items.map((risk) => [risk.id, { selected: false, likelihood: String(risk.likelihood), impact: String(risk.impact) }])));
      })
      .catch(() => setError('Impossible de charger les risques à revoir.'))
      .finally(() => setLoading(false));
  }, []);

  function updateRow(id, patch) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const selectedItems = items.filter((risk) => rows[risk.id]?.selected);

  function toggleAll() {
    const allSelected = selectedItems.length === items.length;
    setRows((prev) => Object.fromEntries(Object.entries(prev).map(([id, row]) => [id, { ...row, selected: !allSelected }])));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selectedItems.length === 0) {
      setError('Cochez au moins un risque passé en revue.');
      return;
    }
    setError('');
    setSubmitting(true);
    // Seules les cotations réellement modifiées sont envoyées : un risque « revu, inchangé » l'est pour de bon.
    const payload = {
      items: selectedItems.map((risk) => {
        const row = rows[risk.id];
        const item = { id: risk.id };
        if (Number(row.likelihood) !== risk.likelihood) item.likelihood = Number(row.likelihood);
        if (Number(row.impact) !== risk.impact) item.impact = Number(row.impact);
        return item;
      }),
      next_review_date: addMonthsIso(nextMonths),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    };
    let data;
    try {
      ({ data } = await api.post('/risks/bulk-review', payload));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d\'enregistrer la revue.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setResult(data);
    onReviewed();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Risques à revoir</h2>
            <p className="text-sm text-slate-500">Revues dépassées, prévues dans les 90 jours ou jamais planifiées.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 shrink-0 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div>
            <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {result.reviewed} risque{result.reviewed > 1 ? 's' : ''} revu{result.reviewed > 1 ? 's' : ''}. Prochaine revue fixée au {formatIsoDate(addMonthsIso(nextMonths))}.
              {result.skipped.length > 0 && ` ${result.skipped.length} ignoré${result.skipped.length > 1 ? 's' : ''} (introuvable ou hors de votre vue).`}
            </p>
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-md bg-primary py-3 font-medium text-white hover:bg-primary-700">
              Fermer
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-20 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div>
            <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">Aucun risque à revoir pour l'instant.</p>
            {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button type="button" onClick={toggleAll} className="flex min-h-[40px] items-center text-sm font-medium text-primary hover:underline">
              {selectedItems.length === items.length ? 'Tout décocher' : `Tout cocher (${items.length})`}
            </button>

            <ul className="space-y-3">
              {items.map((risk) => {
                const row = rows[risk.id];
                const score = Number(row.likelihood) * Number(row.impact);
                const level = riskLevel(score);
                const changed = Number(row.likelihood) !== risk.likelihood || Number(row.impact) !== risk.impact;
                return (
                  <li key={risk.id} className={`rounded-lg border p-3 ${row.selected ? 'border-primary/50 bg-primary/5' : 'border-slate-200'}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => updateRow(risk.id, { selected: e.target.checked })}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium text-slate-900">{risk.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STATE_STYLES[risk.review_state]}`}>{describeReviewDate(risk.review_date)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[level]}`}>
                            {score} · {RISK_LEVEL_LABELS[level]}
                            {changed ? ' (modifié)' : ''}
                          </span>
                          {risk.is_unacceptable && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Inacceptable</span>}
                          {risk.owner_user && <span className="text-xs text-slate-500">{risk.owner_user.full_name}</span>}
                        </span>
                      </span>
                    </label>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <ScoreSelect label="Probabilité" value={row.likelihood} options={LIKELIHOOD_LABELS} onChange={(value) => updateRow(risk.id, { likelihood: value, selected: true })} />
                      <ScoreSelect label="Gravité" value={row.impact} options={IMPACT_LABELS} onChange={(value) => updateRow(risk.id, { impact: value, selected: true })} />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <input type="text" maxLength={500} placeholder="Revue trimestrielle" value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_CLASS} />
              </div>
            </div>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {submitting ? 'Enregistrement...' : `Valider la revue (${selectedItems.length} risque${selectedItems.length > 1 ? 's' : ''})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
