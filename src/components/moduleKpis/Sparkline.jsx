import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import { STATUS_COLORS } from '../../lib/moduleKpis.js';

// Mini-courbe d'un indicateur (sans axes) avec son objectif en pointillés. Une seule valeur : un point seul suffit à dire
// « historique en construction ».
export default function Sparkline({ series, target, status }) {
  if (!series || series.length === 0) return null;
  const color = STATUS_COLORS[status] || STATUS_COLORS.neutral;
  const values = series.map((point) => point.value);
  const candidates = target === null || target === undefined ? values : [...values, target];
  const min = Math.min(...candidates);
  const max = Math.max(...candidates);
  const pad = max === min ? 1 : (max - min) * 0.15;
  return (
    <div className="h-9 w-24 shrink-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={[min - pad, max + pad]} />
          {target !== null && target !== undefined && <ReferenceLine y={target} stroke="#94a3b8" strokeDasharray="3 3" />}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={series.length === 1 ? { r: 3, fill: color } : false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
