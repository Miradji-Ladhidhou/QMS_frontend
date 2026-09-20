import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api.js';
import { RISK_STATUS_LABELS } from '../../lib/riskStatus.js';

const BRUT_COLOR = '#1F3864';
const RESIDUAL_COLOR = '#009E73';

const formatDate = (value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const formatDateTime = (value) =>
  new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function scoreText(likelihood, impact, score) {
  return likelihood && impact ? `${likelihood} × ${impact} = ${score}` : 'non évalué';
}

// Évolution de la cotation d'un risque : courbe du score brut et du score résiduel dans le temps (avec le
// seuil d'acceptabilité), résumé « avant → après traitement » et liste détaillée des changements. Chaque
// ligne de l'historique est écrite par le serveur à chaque changement de cotation, de résiduel ou de statut,
// ou lors d'une revue.
export default function RiskHistoryCard({ riskId, threshold, refreshKey }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get(`/risks/${riskId}/assessments`)
      .then(({ data }) => setHistory(data))
      .catch(() => setError(true));
  }, [riskId, refreshKey]);

  if (error) return null;
  if (!history) return <div className="mt-4 h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  if (history.length === 0) return null;

  const first = history[0];
  const last = history[history.length - 1];
  const currentScore = last.residual_score ?? last.score;
  const delta = currentScore - first.score;
  // Un point par changement, régulièrement espacés : plusieurs cotations le même jour restent lisibles
// (un axe de dates les superposerait). L'étiquette de l'axe est la date, l'infobulle la date et l'heure.
const chartData = history.map((entry, index) => ({ n: index, date: formatDate(entry.assessed_at), full: formatDateTime(entry.assessed_at), brut: entry.score, residuel: entry.residual_score ?? null }));

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">Évolution de la cotation</h2>
      <p className="mt-1 text-sm text-slate-600">
        Cotation initiale <strong className="text-slate-900">{first.score}</strong> → score en vigueur <strong className="text-slate-900">{currentScore}</strong>
        {history.length > 1 && (
          <span className={delta < 0 ? 'text-emerald-700' : delta > 0 ? 'text-red-700' : 'text-slate-500'}>
            {' '}
            ({delta > 0 ? '+' : ''}
            {delta})
          </span>
        )}
        {last.residual_score === null && <span className="text-slate-400"> — résiduel non évalué</span>}
      </p>

      {history.length > 1 ? (
        <div className="mt-3 h-52 w-full sm:h-60" role="img" aria-label="Courbe d'évolution du score du risque">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="n" type="number" domain={[0, history.length - 1]} ticks={chartData.map((point) => point.n)} tickFormatter={(n) => chartData[n]?.date || ''} interval="preserveStartEnd" tick={{ fontSize: 11, fill: '#64748b' }} padding={{ left: 8, right: 8 }} />
              <YAxis domain={[0, 25]} ticks={[0, 5, 10, 15, 20, 25]} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip labelFormatter={(n) => chartData[n]?.full || ''} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {threshold && <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="5 4" label={{ value: `Seuil ${threshold}`, position: 'insideTopRight', fontSize: 11, fill: '#dc2626' }} />}
              <Line type="stepAfter" dataKey="brut" name="Score brut" stroke={BRUT_COLOR} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="stepAfter" dataKey="residuel" name="Score résiduel" stroke={RESIDUAL_COLOR} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">La courbe apparaîtra dès la deuxième cotation.</p>
      )}

      <ul className="mt-4 space-y-2">
        {[...history].reverse().map((entry) => (
          <li key={entry.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-medium text-slate-800">{formatDateTime(entry.assessed_at)}</span>
              <span className="text-xs text-slate-500">{RISK_STATUS_LABELS[entry.status] || entry.status}</span>
            </div>
            <p className="text-slate-700">
              Brut {scoreText(entry.likelihood, entry.impact, entry.score)}
              <span className="text-slate-400"> · </span>
              Résiduel {scoreText(entry.residual_likelihood, entry.residual_impact, entry.residual_score)}
            </p>
            {(entry.reason || entry.assessed_by_user) && (
              <p className="break-words text-xs text-slate-500">
                {entry.reason}
                {entry.reason && entry.assessed_by_user ? ' — ' : ''}
                {entry.assessed_by_user?.full_name}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
