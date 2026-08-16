import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Format court de la période, adapté à la fréquence du KPI, pour l'axe X du graphique
// et l'en-tête du tableau d'historique.
function formatPeriodShort(dateStr, frequency) {
  const date = new Date(dateStr);
  switch (frequency) {
    case 'monthly':
      return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    case 'quarterly':
      return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    case 'yearly':
      return String(date.getFullYear());
    case 'weekly':
    case 'daily':
    default:
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}

// <input type="month"> attend "yyyy-MM", <input type="date"> attend "yyyy-MM-dd".
function toInputPeriodValue(periodDate, frequency) {
  return frequency === 'monthly' ? periodDate.slice(0, 7) : periodDate;
}

// L'API attend toujours une date complète — un mois saisi est ramené à son 1er jour.
function fromInputPeriodValue(inputValue, frequency) {
  return frequency === 'monthly' ? `${inputValue}-01` : inputValue;
}

// express-validator renvoie { error, details: [{ path, msg }] } sur un 400 —
// on le transforme en { [nomDuChamp]: message } pour l'afficher sous chaque champ.
function fieldErrorsFromResponse(err) {
  const details = err.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((detail) => [detail.path, detail.msg]));
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

// Sert à la fois la saisie d'une nouvelle valeur et la modification d'une valeur
// existante (depuis l'historique, ou après un conflit de période en création).
function RecordModal({ kpi, record, onClose, onSaved }) {
  const [activeRecord, setActiveRecord] = useState(record);
  const isEditing = Boolean(activeRecord);
  const inputType = kpi.frequency === 'monthly' ? 'month' : 'date';

  const [periodDate, setPeriodDate] = useState(
    toInputPeriodValue(record?.period_date || new Date().toISOString().slice(0, 10), kpi.frequency)
  );
  const [value, setValue] = useState(record ? String(record.value) : '');
  const [comment, setComment] = useState(record?.comment || '');
  const [error, setError] = useState('');
  const [showConflictAction, setShowConflictAction] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setShowConflictAction(false);
    setSubmitting(true);

    const payload = {
      period_date: fromInputPeriodValue(periodDate, kpi.frequency),
      value: Number(value),
      comment: comment || null,
    };

    try {
      const { data } = isEditing
        ? await api.patch(`/kpis/${kpi.id}/records/${activeRecord.id}`, payload)
        : await api.post(`/kpis/${kpi.id}/records`, payload);
      onSaved(data, isEditing);
    } catch (err) {
      if (!isEditing && err.response?.status === 409) {
        setError('Une valeur existe déjà pour cette période.');
        setShowConflictAction(true);
      } else {
        setError(err.response?.data?.error || `Impossible ${isEditing ? 'de modifier' : "d'enregistrer"} cette valeur.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSwitchToEdit() {
    const targetPeriod = fromInputPeriodValue(periodDate, kpi.frequency);
    const existing = kpi.records.find((r) => r.period_date === targetPeriod);
    if (!existing) return;

    setActiveRecord(existing);
    setValue(String(existing.value));
    setComment(existing.comment || '');
    setError('');
    setShowConflictAction(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isEditing ? 'Modifier la valeur' : 'Nouvelle valeur'}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">{kpi.name}</p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <p>{error}</p>
            {showConflictAction && (
              <button
                type="button"
                onClick={handleSwitchToEdit}
                className="mt-2 font-medium text-red-700 underline hover:text-red-800"
              >
                Modifier la valeur existante pour cette période
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Période</label>
            <input
              type={inputType}
              required
              disabled={isEditing}
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Commentaire</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Ajouter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RecordHistoryTable({ kpi, onEditRecord, onDeleteRecord }) {
  const records = [...kpi.records].sort((a, b) => (a.period_date < b.period_date ? 1 : -1));

  if (records.length === 0) {
    return <p className="py-3 text-sm text-slate-400">Aucune valeur enregistrée.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-3">Période</th>
            <th className="py-2 pr-3">Valeur</th>
            <th className="py-2 pr-3">Commentaire</th>
            <th className="py-2 pr-3">Saisi par</th>
            <th className="py-2 pr-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="py-2 pr-3 whitespace-nowrap text-slate-700">{formatDate(record.period_date)}</td>
              <td className="py-2 pr-3 whitespace-nowrap font-medium text-slate-800">
                {record.value} {kpi.unit || ''}
              </td>
              <td className="py-2 pr-3 text-slate-600">{record.comment || '—'}</td>
              <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{record.recorded_by_user?.full_name || '—'}</td>
              <td className="py-2 pr-3 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEditRecord(record)}
                    aria-label="Modifier"
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRecord(record)}
                    aria-label="Supprimer"
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiCard({ kpi, isMenuOpen, onToggleMenu, onEdit, onDelete, onOpenRecordModal, onDeleteRecord }) {
  const [showHistory, setShowHistory] = useState(false);
  const records = [...kpi.records].sort((a, b) => (a.period_date > b.period_date ? 1 : -1));
  const lastRecord = records[records.length - 1];
  const targetDirection = kpi.target_direction || 'min';
  const status = getKpiStatus(lastRecord?.value, kpi.target, targetDirection);
  const StatusIcon = status === 'good' ? CheckCircle2 : status === 'bad' ? AlertCircle : null;
  const hasTarget = kpi.target !== null && kpi.target !== undefined;
  const hasEnoughForChart = records.length >= 2;

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
          <span className={`text-sm ${KPI_STATUS_STYLES.neutral}`}>Aucune valeur enregistrée.</span>
        )}
        <button
          type="button"
          onClick={() => onOpenRecordModal(kpi, null)}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus size={14} />
          Saisir une valeur
        </button>
      </div>

      <div className="mt-4 h-48">
        {hasEnoughForChart ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={records} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="period_date"
                tickFormatter={(date) => formatPeriodShort(date, kpi.frequency)}
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
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Pas assez de données pour un graphique
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Voir l'historique
        </button>

        {showHistory && (
          <div className="mt-2">
            <RecordHistoryTable
              kpi={kpi}
              onEditRecord={(record) => onOpenRecordModal(kpi, record)}
              onDeleteRecord={(record) => onDeleteRecord(kpi, record)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Kpis() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordModal, setRecordModal] = useState(null); // { kpi, record } — record null = création
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

  function handleRecordSaved(kpiId, record, isEditing) {
    setKpis((prev) =>
      prev.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        const records = isEditing
          ? kpi.records.map((r) => (r.id === record.id ? record : r))
          : [...kpi.records, record];
        return { ...kpi, records };
      })
    );
    setRecordModal(null);
  }

  async function handleDeleteRecord(kpi, record) {
    if (!window.confirm(`Supprimer la valeur du ${formatDate(record.period_date)} ?`)) return;

    try {
      await api.delete(`/kpis/${kpi.id}/records/${record.id}`);
      setKpis((prev) =>
        prev.map((item) =>
          item.id === kpi.id ? { ...item, records: item.records.filter((r) => r.id !== record.id) } : item
        )
      );
    } catch {
      setError('Impossible de supprimer cette valeur.');
    }
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
              onOpenRecordModal={(kpiArg, record) => setRecordModal({ kpi: kpiArg, record })}
              onDeleteRecord={handleDeleteRecord}
            />
          ))}
        </div>
      )}

      {recordModal && (
        <RecordModal
          kpi={recordModal.kpi}
          record={recordModal.record}
          onClose={() => setRecordModal(null)}
          onSaved={(data, isEditing) => handleRecordSaved(recordModal.kpi.id, data, isEditing)}
        />
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
