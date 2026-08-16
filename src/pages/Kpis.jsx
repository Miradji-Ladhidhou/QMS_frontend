import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';
import { getKpiStatus, KPI_STATUS_LABELS, KPI_STATUS_STYLES } from '../lib/kpiStatus.js';

const LINE_COLOR = '#1F3864';
const GRID_COLOR = '#e2e8f0';
const MUTED_COLOR = '#94a3b8';

function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function ValueModal({ kpi, onClose, onRecorded }) {
  const [periodDate, setPeriodDate] = useState(new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.post(`/kpis/${kpi.id}/records`, {
        period_date: periodDate,
        value: Number(value),
      });
      onRecorded(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer cette valeur.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle valeur</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">{kpi.name}</p>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Période</label>
            <input
              type="date"
              required
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Valeur {kpi.unit ? `(${kpi.unit})` : ''}</label>
            <input
              type="number"
              step="any"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function KpiCard({ kpi, onRecordClick, onDirectionChange }) {
  const records = [...kpi.records].sort((a, b) => (a.period_date > b.period_date ? 1 : -1));
  const lastRecord = records[records.length - 1];
  const targetDirection = kpi.target_direction || 'min';
  const status = getKpiStatus(lastRecord?.value, kpi.target, targetDirection);
  const StatusIcon = status === 'good' ? CheckCircle2 : status === 'bad' ? AlertCircle : null;
  const hasTarget = kpi.target !== null && kpi.target !== undefined;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{kpi.name}</p>
          {hasTarget && (
            <p className="text-sm text-slate-500">
              Objectif : {targetDirection === 'max' ? '≤' : '≥'} {kpi.target} {kpi.unit || ''}
            </p>
          )}
          {hasTarget && (
            <select
              value={targetDirection}
              onChange={(e) => onDirectionChange(kpi, e.target.value)}
              className="mt-1 rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="min">Plus haut = mieux</option>
              <option value="max">Plus bas = mieux</option>
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRecordClick(kpi)}
          className="flex shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus size={16} />
          Saisir
        </button>
      </div>

      {lastRecord && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-2xl font-semibold ${KPI_STATUS_STYLES[status]}`}>
            {lastRecord.value} {kpi.unit || ''}
          </span>
          {StatusIcon && (
            <span className={`flex items-center gap-1 text-xs font-medium ${KPI_STATUS_STYLES[status]}`}>
              <StatusIcon size={14} />
              {KPI_STATUS_LABELS[status]}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 h-48">
        {records.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Aucune valeur enregistrée.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={records} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="period_date"
                tickFormatter={formatDateShort}
                axisLine={false}
                tickLine={false}
                tick={{ fill: MUTED_COLOR, fontSize: 11 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: MUTED_COLOR, fontSize: 11 }} width={40} />
              <Tooltip
                formatter={(val) => [`${val} ${kpi.unit || ''}`, kpi.name]}
                labelFormatter={(label) => formatDate(label)}
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }}
              />
              {kpi.target !== null && kpi.target !== undefined && (
                <ReferenceLine
                  y={kpi.target}
                  stroke={MUTED_COLOR}
                  strokeDasharray="4 4"
                  label={{ value: 'Objectif', position: 'insideTopRight', fontSize: 11, fill: MUTED_COLOR }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={LINE_COLOR}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff', fill: LINE_COLOR }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function Kpis() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordingKpi, setRecordingKpi] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/kpis');
        setKpis(data);
      } catch {
        setError('Impossible de charger les KPIs.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleRecorded(record) {
    setKpis((prev) =>
      prev.map((kpi) => (kpi.id === recordingKpi.id ? { ...kpi, records: [...kpi.records, record] } : kpi))
    );
    setRecordingKpi(null);
  }

  async function handleDirectionChange(kpi, targetDirection) {
    try {
      const { data } = await api.patch(`/kpis/${kpi.id}`, { target_direction: targetDirection });
      setKpis((prev) => prev.map((item) => (item.id === kpi.id ? { ...item, ...data } : item)));
    } catch {
      setError("Impossible de mettre à jour le sens de l'objectif.");
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">KPIs</h1>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((key) => (
            <div key={key} className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : kpis.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucun KPI suivi pour l'instant.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} onRecordClick={setRecordingKpi} onDirectionChange={handleDirectionChange} />
          ))}
        </div>
      )}

      {recordingKpi && (
        <ValueModal kpi={recordingKpi} onClose={() => setRecordingKpi(null)} onRecorded={handleRecorded} />
      )}
    </div>
  );
}
