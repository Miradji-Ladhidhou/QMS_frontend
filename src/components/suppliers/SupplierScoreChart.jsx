import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CRITERIA, formatIsoDate } from '../../lib/supplierPolicy.js';

const CRITERION_COLORS = { quality: '#64748b', delivery: '#94a3b8', price: '#818cf8', responsiveness: '#f59e0b' };

const formatShort = (value) => new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

// Évolution des notes d'un fournisseur, évaluation après évaluation : les quatre critères en traits fins, la note globale
// en gras, les deux seuils de décision en pointillés. Un point par évaluation, régulièrement espacés (deux
// évaluations proches restent lisibles).
export default function SupplierScoreChart({ evaluations, thresholds }) {
  if (evaluations.length < 2) return null;
  const ordered = [...evaluations].sort((a, b) => (a.evaluation_date < b.evaluation_date ? -1 : a.evaluation_date > b.evaluation_date ? 1 : a.created_at < b.created_at ? -1 : 1));
  const data = ordered.map((evaluation, index) => ({
    n: index,
    date: formatShort(evaluation.evaluation_date),
    full: formatIsoDate(evaluation.evaluation_date),
    score: Number(evaluation.score),
    quality: evaluation.quality_score,
    delivery: evaluation.delivery_score,
    price: evaluation.price_score,
    responsiveness: evaluation.responsiveness_score,
  }));
  const first = data[0].score;
  const last = data[data.length - 1].score;
  const delta = Math.round((last - first) * 100) / 100;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">Évolution des notes</h2>
      <p className="mt-1 text-sm text-slate-600">
        Note globale <strong className="text-slate-900">{first.toFixed(2).replace('.', ',')}</strong> → <strong className="text-slate-900">{last.toFixed(2).replace('.', ',')}</strong>
        <span className={delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-red-700' : 'text-slate-500'}>
          {' '}
          ({delta > 0 ? '+' : ''}
          {String(delta).replace('.', ',')})
        </span>
      </p>
      <div className="mt-3 h-56 w-full sm:h-64" role="img" aria-label="Courbe d'évolution des notes du fournisseur">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="n" type="number" domain={[0, data.length - 1]} ticks={data.map((point) => point.n)} tickFormatter={(n) => data[n]?.date || ''} interval="preserveStartEnd" padding={{ left: 8, right: 8 }} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip labelFormatter={(n) => data[n]?.full || ''} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {thresholds && <ReferenceLine y={thresholds.watch} stroke="#d97706" strokeDasharray="5 4" label={{ value: `Surveillance ${thresholds.watch}`, position: 'insideTopRight', fontSize: 10, fill: '#b45309' }} />}
            {thresholds && <ReferenceLine y={thresholds.replace} stroke="#dc2626" strokeDasharray="5 4" label={{ value: `Remplacer ${thresholds.replace}`, position: 'insideBottomRight', fontSize: 10, fill: '#dc2626' }} />}
            {CRITERIA.map((criterion) => (
              <Line key={criterion.key} type="monotone" dataKey={criterion.key} name={criterion.label} stroke={CRITERION_COLORS[criterion.key]} strokeWidth={1} dot={{ r: 2 }} isAnimationActive={false} />
            ))}
            <Line type="monotone" dataKey="score" name="Note globale" stroke="#1F3864" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
