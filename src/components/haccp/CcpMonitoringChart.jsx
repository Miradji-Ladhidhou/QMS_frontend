import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { getPdfDownload } from '../../lib/pdfExport.js';
import { formatLimits } from '../../lib/haccpMonitoring.js';
import CcpStatusChip from './CcpStatusChip.jsx';

const PERIODS = [
  { days: 7, label: '7 j' },
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
];

const formatShort = (value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const formatFull = (value) => new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Point du graphique : vert dans les limites, rouge hors limites (un relevé hors limites se voit d'un coup d'œil).
function ReadingDot({ cx, cy, payload }) {
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={payload.within_limits ? 3.5 : 5} fill={payload.within_limits ? '#059669' : '#dc2626'} stroke="#fff" strokeWidth={1.5} />;
}

// Tableau de bord d'un CCP : courbe des valeurs relevées avec la zone de limites, taux de conformité, moyenne /
// min / max, dérives récentes, état du prochain relevé. Rechargé après chaque nouveau relevé (`refreshKey`).
export default function CcpMonitoringChart({ ccp, refreshKey, showAlert = true }) {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    setError(false);
    api
      .get(`/haccp/ccps/${ccp.id}/monitoring-summary`, { params: { days } })
      .then(({ data }) => setSummary(data))
      .catch(() => setError(true));
  }, [ccp.id, days, refreshKey]);

  async function download(kind) {
    setDownloading(kind);
    try {
      await getPdfDownload(`/haccp/ccps/${ccp.id}/${kind === 'sheet' ? 'record-sheet' : 'pdf'}`, `${kind === 'sheet' ? 'fiche-releves' : 'fiche-ccp'}-${(ccp.ccp_number || 'ccp').toLowerCase()}.pdf`);
    } catch {
      setError(true);
    } finally {
      setDownloading('');
    }
  }

  if (error) return <p className="mt-3 text-xs text-red-600">Impossible de charger la synthèse de surveillance.</p>;
  if (!summary) return <div className="mt-3 h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;

  const { stats, limits } = summary;
  const numeric = summary.points.filter((point) => point.value !== null);
  // Tous les relevés le même jour : l'axe montre les heures (sinon vingt fois la même date).
  const sameDay = new Set(numeric.map((point) => new Date(point.recorded_at).toDateString())).size <= 1;
  const chartData = numeric.map((point) => ({
    ...point,
    label: sameDay ? new Date(point.recorded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : formatShort(point.recorded_at),
    full: formatFull(point.recorded_at),
  }));
  const yValues = [...numeric.map((point) => point.value), ...(limits?.min !== null && limits?.min !== undefined ? [limits.min] : []), ...(limits?.max !== null && limits?.max !== undefined ? [limits.max] : [])];
  const pad = yValues.length ? Math.max(1, (Math.max(...yValues) - Math.min(...yValues)) * 0.15) : 1;
  const domain = yValues.length ? [Math.floor(Math.min(...yValues) - pad), Math.ceil(Math.max(...yValues) + pad)] : [0, 1];

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Tableau de bord</h3>
          <CcpStatusChip ccp={summary} />
        </div>
        <div className="flex gap-1" role="group" aria-label="Période">
          {PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              onClick={() => setDays(period.days)}
              aria-pressed={days === period.days}
              className={`min-h-[40px] rounded-md border px-3 py-1 text-xs font-medium sm:min-h-0 ${days === period.days ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {summary.repeated_deviation && showAlert && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {summary.recent_deviations} relevés hors limites ces 7 derniers jours : une action corrective immédiate ne suffit plus, traitez la cause (CAPA ou risque).
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Relevés" value={stats.total} />
        <Stat label="Conformité" value={stats.conformity_percent === null ? '—' : `${stats.conformity_percent} %`} tone={stats.out === 0 ? 'good' : 'bad'} />
        <Stat label="Hors limites" value={stats.out} tone={stats.out > 0 ? 'bad' : undefined} />
        <Stat label="Moyenne" value={stats.average === null ? '—' : `${stats.average}${limits?.unit ? ` ${limits.unit}` : ''}`} hint={stats.min !== null ? `${stats.min} – ${stats.max}` : undefined} />
      </div>

      {chartData.length >= 2 ? (
        <div className="mt-3 h-52 w-full sm:h-64" role="img" aria-label={`Courbe des relevés du ${ccp.ccp_number || 'point critique'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              {limits && (
                <ReferenceArea
                  y1={limits.min !== null && limits.min !== undefined ? limits.min : domain[0]}
                  y2={limits.max !== null && limits.max !== undefined ? limits.max : domain[1]}
                  fill="#10b981"
                  fillOpacity={0.08}
                />
              )}
              {limits?.max !== null && limits?.max !== undefined && <ReferenceLine y={limits.max} stroke="#dc2626" strokeDasharray="5 4" label={{ value: `max ${limits.max}`, position: 'insideTopRight', fontSize: 11, fill: '#dc2626' }} />}
              {limits?.min !== null && limits?.min !== undefined && <ReferenceLine y={limits.min} stroke="#dc2626" strokeDasharray="5 4" label={{ value: `min ${limits.min}`, position: 'insideBottomRight', fontSize: 11, fill: '#dc2626' }} />}
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={24} />
              <YAxis domain={domain} allowDecimals tick={{ fontSize: 11, fill: '#64748b' }} width={44} />
              <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ''} formatter={(value) => [`${value}${limits?.unit ? ` ${limits.unit}` : ''}`, 'Valeur']} />
              <Line type="monotone" dataKey="value" stroke="#1F3864" strokeWidth={2} dot={<ReadingDot />} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
          {limits ? 'La courbe apparaît dès le deuxième relevé chiffré.' : 'Ce point critique n’a pas de limites chiffrées : renseignez-les pour obtenir la courbe et le verdict automatique.'}
        </p>
      )}
      {limits && <p className="mt-1 text-xs text-slate-400">Zone verte : {formatLimits(limits)}. Point rouge : relevé hors limites.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => download('pdf')} disabled={Boolean(downloading)} className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0">
          {downloading === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Fiche du point critique (PDF)
        </button>
        <button type="button" onClick={() => download('sheet')} disabled={Boolean(downloading)} className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0">
          {downloading === 'sheet' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Fiche de relevés vierge (PDF)
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, tone }) {
  const color = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-slate-900';
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">
        {label}
        {hint ? ` · ${hint}` : ''}
      </p>
    </div>
  );
}
