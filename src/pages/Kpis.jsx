import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';
import { getKpiStatus, KPI_STATUS_LABELS, KPI_STATUS_STYLES } from '../lib/kpiStatus.js';

const LINE_COLOR = '#1F3864';
const GRID_COLOR = '#e2e8f0';
const MUTED_COLOR = '#94a3b8';

const FREQUENCY_LABELS = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// express-validator renvoie { error, details: [{ path, msg }] } sur un 400 —
// on le transforme en { [nomDuChamp]: message } pour l'afficher sous chaque champ.
function fieldErrorsFromResponse(err) {
  const details = err.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((detail) => [detail.path, detail.msg]));
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

function KpiFormModal({ kpi, onClose, onSaved }) {
  const isEditing = Boolean(kpi);
  const [form, setForm] = useState({
    name: kpi?.name || '',
    unit: kpi?.unit || '',
    target: kpi?.target ?? '',
    target_direction: kpi?.target_direction || 'min',
    frequency: kpi?.frequency || '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const hasTarget = form.target !== '';

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function inputClassName(field) {
    return `w-full rounded-md border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
      fieldErrors[field] ? 'border-red-300' : 'border-slate-300'
    }`;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      name: form.name,
      unit: form.unit || null,
      target: hasTarget ? Number(form.target) : null,
      // target_direction est NOT NULL en base : on ne l'envoie que si une cible existe,
      // jamais explicitement à null (sinon la mise à jour échouerait).
      target_direction: hasTarget ? form.target_direction : undefined,
      frequency: form.frequency || null,
    };

    try {
      const { data } = isEditing
        ? await api.patch(`/kpis/${kpi.id}`, payload)
        : await api.post('/kpis', payload);
      onSaved(data, isEditing);
    } catch (err) {
      setFieldErrors(fieldErrorsFromResponse(err));
      setError(err.response?.data?.error || `Impossible ${isEditing ? 'de modifier' : 'de créer'} le KPI.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isEditing ? 'Modifier le KPI' : 'Nouveau KPI'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={inputClassName('name')}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Unité</label>
            <input
              type="text"
              placeholder="%, h, nb..."
              value={form.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              className={inputClassName('unit')}
            />
            {fieldErrors.unit && <p className="mt-1 text-xs text-red-600">{fieldErrors.unit}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objectif / cible</label>
            <input
              type="number"
              step="any"
              value={form.target}
              onChange={(e) => updateField('target', e.target.value)}
              className={inputClassName('target')}
            />
            {fieldErrors.target && <p className="mt-1 text-xs text-red-600">{fieldErrors.target}</p>}
          </div>

          {hasTarget && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sens de l'objectif</label>
              <select
                value={form.target_direction}
                onChange={(e) => updateField('target_direction', e.target.value)}
                className={inputClassName('target_direction')}
              >
                <option value="min">Au moins (min)</option>
                <option value="max">Au maximum (max)</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">
                {form.target_direction === 'max'
                  ? "Plus la valeur est basse, mieux c'est (ex : taux de retour)."
                  : "Plus la valeur est haute, mieux c'est (ex : taux de service)."}
              </p>
              {fieldErrors.target_direction && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.target_direction}</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence</label>
            <select
              value={form.frequency}
              onChange={(e) => updateField('frequency', e.target.value)}
              className={inputClassName('frequency')}
            >
              <option value="">Non définie</option>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {fieldErrors.frequency && <p className="mt-1 text-xs text-red-600">{fieldErrors.frequency}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer le KPI'}
          </button>
        </form>
      </div>
    </div>
  );
}

function KpiCard({ kpi, isMenuOpen, onToggleMenu, onEdit, onDelete, onRecordClick }) {
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
          {kpi.frequency && (
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {FREQUENCY_LABELS[kpi.frequency] || kpi.frequency}
            </span>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => onToggleMenu(kpi.id)}
            aria-label="Actions"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
          >
            <MoreVertical size={18} />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => onToggleMenu(null)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onToggleMenu(null);
                    onEdit(kpi);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={14} />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleMenu(null);
                    onDelete(kpi);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {lastRecord ? (
          <div className="flex items-center gap-2">
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
        ) : (
          <span className="text-sm text-slate-400">Aucune valeur enregistrée.</span>
        )}
        <button
          type="button"
          onClick={() => onRecordClick(kpi)}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus size={14} />
          Saisir
        </button>
      </div>

      {records.length > 0 && (
        <div className="mt-4 h-48">
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
              {hasTarget && (
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
        </div>
      )}
    </div>
  );
}

export default function Kpis() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordingKpi, setRecordingKpi] = useState(null);
  const [formModal, setFormModal] = useState(null); // null fermé, 'new' création, objet kpi édition
  const [openMenuId, setOpenMenuId] = useState(null);

  async function loadKpis() {
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

  useEffect(() => {
    loadKpis();
  }, []);

  function handleRecorded(record) {
    setKpis((prev) =>
      prev.map((kpi) => (kpi.id === recordingKpi.id ? { ...kpi, records: [...kpi.records, record] } : kpi))
    );
    setRecordingKpi(null);
  }

  function handleSaved(data, isEditing) {
    if (isEditing) {
      // PATCH ne renvoie pas les records : on fusionne pour ne pas les perdre.
      setKpis((prev) => prev.map((kpi) => (kpi.id === data.id ? { ...kpi, ...data } : kpi)));
    } else {
      setKpis((prev) => [...prev, { ...data, records: [] }]);
    }
    setFormModal(null);
  }

  async function handleDelete(kpi) {
    if (
      !window.confirm(
        `Supprimer le KPI "${kpi.name}" ? Cette action supprimera aussi toutes les valeurs enregistrées.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/kpis/${kpi.id}`);
      setKpis((prev) => prev.filter((item) => item.id !== kpi.id));
    } catch {
      setError('Impossible de supprimer ce KPI.');
    }
  }

  function toggleMenu(id) {
    setOpenMenuId((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">KPIs</h1>
        <button
          type="button"
          onClick={() => setFormModal('new')}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus size={18} />
          Nouveau KPI
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : kpis.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <BarChart3 size={40} className="text-slate-300" />
          <p className="mt-4 text-base font-medium text-slate-700">Aucun KPI configuré</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Créez votre premier indicateur pour commencer à suivre vos performances.
          </p>
          <button
            type="button"
            onClick={() => setFormModal('new')}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Nouveau KPI
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              isMenuOpen={openMenuId === kpi.id}
              onToggleMenu={toggleMenu}
              onEdit={setFormModal}
              onDelete={handleDelete}
              onRecordClick={setRecordingKpi}
            />
          ))}
        </div>
      )}

      {recordingKpi && (
        <ValueModal kpi={recordingKpi} onClose={() => setRecordingKpi(null)} onRecorded={handleRecorded} />
      )}

      {formModal && (
        <KpiFormModal
          kpi={formModal === 'new' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
