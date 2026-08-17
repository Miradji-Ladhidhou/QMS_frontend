import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  History,
  Image as ImageIcon,
  MoreVertical,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toPng } from 'html-to-image';
import { api } from '../lib/api.js';
import { getKpiStatus, KPI_STATUS_LABELS, KPI_STATUS_STYLES } from '../lib/kpiStatus.js';
import { exportToCsv } from '../lib/csvExport.js';

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

const SOURCE_LABELS = {
  manual: 'Saisie manuelle',
  import: 'Import',
};

const SOURCE_STYLES = {
  manual: 'bg-slate-100 text-slate-600',
  import: 'bg-blue-100 text-blue-700',
};

const CALC_TYPE_OPTIONS = [
  { value: 'ratio', label: 'Pourcentage (ex : % conforme)' },
  { value: 'sum', label: 'Somme' },
  { value: 'average', label: 'Moyenne' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'count', label: 'Nombre de lignes' },
  { value: 'count_grouped', label: 'Répartition par catégorie' },
];

const CALC_TYPE_LABELS = Object.fromEntries(CALC_TYPE_OPTIONS.map((option) => [option.value, option.label]));

const FILTER_OPERATOR_OPTIONS = [
  { value: 'equals', label: 'est égal à' },
  { value: 'not_equals', label: 'est différent de' },
  { value: 'contains', label: 'contient' },
  { value: 'not_contains', label: 'ne contient pas' },
  { value: 'greater_than', label: 'est supérieur à' },
  { value: 'greater_or_equal', label: 'est supérieur ou égal à' },
  { value: 'less_than', label: 'est inférieur à' },
  { value: 'less_or_equal', label: 'est inférieur ou égal à' },
  { value: 'is_empty', label: 'est vide' },
  { value: 'is_not_empty', label: "n'est pas vide" },
];

const OPERATORS_WITHOUT_VALUE = new Set(['is_empty', 'is_not_empty']);
const FILTER_OPERATOR_LABELS = Object.fromEntries(FILTER_OPERATOR_OPTIONS.map((o) => [o.value, o.label]));

function describeFiltersShort(filters, logic) {
  if (!filters || filters.length === 0) return null;
  const parts = filters.map((f) => {
    const opLabel = FILTER_OPERATOR_LABELS[f.operator] || f.operator;
    return OPERATORS_WITHOUT_VALUE.has(f.operator) ? `"${f.column}" ${opLabel}` : `"${f.column}" ${opLabel} "${f.value}"`;
  });
  return parts.join(logic === 'any' ? ' OU ' : ' ET ');
}

function isFilterComplete(filter) {
  if (!filter.column || !filter.operator) return false;
  if (OPERATORS_WITHOUT_VALUE.has(filter.operator)) return true;
  return filter.value !== undefined && filter.value !== null && filter.value !== '';
}

const TEMPLATE_HEADERS = ['Référence', 'Résultat', 'Valeur', 'Catégorie', 'Période'];

function buildTemplateRows() {
  const month = new Date().toISOString().slice(0, 7);
  return [
    ['ITEM-001', 'Conforme', '120', 'Support', month],
    ['ITEM-002', 'Non conforme', '95', 'Logistique', month],
    ['ITEM-003', 'Conforme', '140', 'Support', month],
  ];
}

// Jetons reconnus comme valeur "positive"/"négative" d'une colonne binaire (conformité,
// oui/non...), pour deviner une recette de type ratio sans que l'utilisateur ait à tout
// configurer à la main quand son fichier a déjà cette forme la plus courante.
const POSITIVE_TOKENS = new Set(['conforme', 'oui', 'yes', 'ok', 'true', 'vrai', '1']);
const NEGATIVE_TOKENS = new Set(['non conforme', 'non-conforme', 'non_conforme', 'non', 'no', 'ko', 'false', 'faux', '0']);

function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isNumericValue(value) {
  if (value === null || value === undefined || value === '') return false;
  const str = String(value).trim().replace(',', '.');
  return str !== '' && !Number.isNaN(Number(str));
}

// Colonne "période" probable, repérée par son nom (date, mois, période, année...) plutôt
// que son contenu — plus fiable qu'analyser 5 lignes d'échantillon pour ça.
function looksLikePeriodColumnName(name) {
  const normalized = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  return /date|periode|mois|annee|year|month/.test(normalized);
}

function detectPeriodColumn(columns) {
  return columns.find(looksLikePeriodColumnName) || '';
}

// Devine une recette de calcul plausible à partir des colonnes détectées et d'un échantillon
// de lignes — un point de départ à vérifier/ajuster, jamais appliqué sans que l'utilisateur
// ne voie et ne valide le formulaire pré-rempli.
function detectCalcSuggestion(columns, sampleRows, periodColumn) {
  const candidates = columns.filter((c) => c !== periodColumn);

  for (const column of candidates) {
    const values = sampleRows.map((row) => normalizeToken(row[column])).filter(Boolean);
    if (values.length === 0) continue;
    const distinct = new Set(values);
    const hasPositive = [...distinct].some((v) => POSITIVE_TOKENS.has(v));
    const allBinary = [...distinct].every((v) => POSITIVE_TOKENS.has(v) || NEGATIVE_TOKENS.has(v));
    if (hasPositive && allBinary) {
      const originalPositiveValue = sampleRows.map((row) => row[column]).find((v) => POSITIVE_TOKENS.has(normalizeToken(v)));
      return {
        calc_type: 'ratio',
        filters: [{ column, operator: 'equals', value: String(originalPositiveValue) }],
        filter_logic: 'all',
      };
    }
  }

  for (const column of candidates) {
    const values = sampleRows.map((row) => row[column]).filter((v) => v !== null && v !== undefined && v !== '');
    if (values.length > 0 && values.every(isNumericValue)) {
      return { calc_type: 'average', source_column: column };
    }
  }

  return null;
}

const EMPTY_CONFIG_FORM = {
  calc_type: 'ratio',
  source_column: '',
  filters: [],
  filter_logic: 'all',
  group_by_column: '',
  period_column: '',
};

function configToForm(config) {
  return {
    calc_type: config.calc_type,
    source_column: config.source_column || '',
    filters: config.filters || [],
    filter_logic: config.filter_logic || 'all',
    group_by_column: config.group_by_column || '',
    period_column: config.period_column || '',
  };
}

// Une recette est "complète" côté client selon les mêmes règles que le backend
// (kpis.js POST .../calculation-config) — évite un aller-retour réseau pour un champ
// manquant évident, mais le backend reste la source de vérité en cas de désaccord.
function isConfigComplete(form) {
  if (form.filters.some((f) => !isFilterComplete(f))) return false;
  if (form.calc_type === 'ratio') return form.filters.length > 0;
  if (['sum', 'average', 'min', 'max'].includes(form.calc_type)) return Boolean(form.source_column);
  if (form.calc_type === 'count_grouped') return Boolean(form.group_by_column);
  return true; // count : les conditions restent optionnelles
}

// Nom de fichier sûr pour un téléchargement (évite les caractères qui posent problème
// selon l'OS/le navigateur dans le nom d'un KPI éventuellement accentué).
function sanitizeFilename(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_');
}

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
    calculation_type: kpi?.calculation_type || 'manual',
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
      calculation_type: form.calculation_type,
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Mode de calcul</label>
            <select
              value={form.calculation_type}
              onChange={(e) => updateField('calculation_type', e.target.value)}
              className={inputClassName('calculation_type')}
            >
              <option value="manual">Saisie manuelle</option>
              <option value="import">Calculé depuis un fichier importé</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {form.calculation_type === 'import'
                ? "La valeur est calculée automatiquement à partir d'un fichier importé (CSV ou Excel), selon une recette configurable (pourcentage, somme, moyenne, comptage, répartition...)."
                : 'Une valeur unique est saisie directement pour chaque période.'}
            </p>
            {fieldErrors.calculation_type && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.calculation_type}</p>
            )}
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

function SourceBadge({ source }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_STYLES[source] || SOURCE_STYLES.manual}`}
    >
      {SOURCE_LABELS[source] || source}
    </span>
  );
}

function RecordHistoryTable({ kpi, onEditRecord, onDeleteRecord }) {
  const records = [...kpi.records].sort((a, b) => (a.period_date < b.period_date ? 1 : -1));
  const isImportBased = kpi.calculation_type === 'import';

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
            {isImportBased && <th className="py-2 pr-3">Source</th>}
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
              {isImportBased && (
                <td className="py-2 pr-3">
                  <SourceBadge source={record.source} />
                </td>
              )}
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

// Sélectionne parmi les colonnes détectées d'un import (aperçu du wizard), ou saisie libre
// quand aucun fichier n'est chargé dans ce contexte (édition de la recette hors import) — la
// valeur doit alors correspondre exactement à un en-tête d'un futur fichier importé.
function ColumnField({ label, value, onChange, columns, required, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {columns ? (
        <select
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">{placeholder || 'Sélectionner une colonne'}</option>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nom exact de la colonne"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      )}
    </div>
  );
}

// Une ou plusieurs conditions (colonne/opérateur/valeur), combinables en ET/OU — utilisées
// pour restreindre les lignes prises en compte par n'importe quel type de calcul (pas
// seulement le pourcentage). columns=null (édition hors import) bascule la colonne en
// saisie libre plutôt qu'un select.
function FilterBuilder({ filters, filterLogic, onChange, columns, sampleRows, required }) {
  function updateFilter(index, patch) {
    onChange({ filters: filters.map((f, i) => (i === index ? { ...f, ...patch } : f)), filter_logic: filterLogic });
  }
  function addFilter() {
    onChange({ filters: [...filters, { column: '', operator: 'equals', value: '' }], filter_logic: filterLogic });
  }
  function removeFilter(index) {
    onChange({ filters: filters.filter((_, i) => i !== index), filter_logic: filterLogic });
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Conditions {required ? '' : '(optionnel)'}
      </label>

      {filters.length === 0 && (
        <p className="mb-2 text-xs text-slate-400">
          {required ? 'Ajoutez au moins une condition.' : 'Sans condition, toutes les lignes de la période sont prises en compte.'}
        </p>
      )}

      <div className="space-y-2">
        {filters.map((filter, index) => {
          const suggestions =
            filter.column && sampleRows
              ? Array.from(
                  new Set(
                    sampleRows
                      .map((row) => row[filter.column])
                      .filter((v) => v !== undefined && v !== null && v !== '')
                      .map(String)
                  )
                )
              : [];
          const needsValue = !OPERATORS_WITHOUT_VALUE.has(filter.operator);

          return (
            <div key={index} className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 p-2">
              {index > 0 && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  {filterLogic === 'any' ? 'ou' : 'et'}
                </span>
              )}
              {columns ? (
                <select
                  value={filter.column}
                  onChange={(e) => updateFilter(index, { column: e.target.value })}
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Colonne</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={filter.column}
                  onChange={(e) => updateFilter(index, { column: e.target.value })}
                  placeholder="Colonne"
                  className="w-28 rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              )}
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(index, { operator: e.target.value })}
                className="rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {FILTER_OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {needsValue && (
                <>
                  <input
                    type="text"
                    list={`kpi-filter-suggestions-${index}`}
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder="Valeur"
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  {suggestions.length > 0 && (
                    <datalist id={`kpi-filter-suggestions-${index}`}>
                      {suggestions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => removeFilter(index)}
                aria-label="Supprimer la condition"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={addFilter}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Plus size={14} />
          Ajouter une condition
        </button>
        {filters.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Combiner :</span>
            <select
              value={filterLogic}
              onChange={(e) => onChange({ filters, filter_logic: e.target.value })}
              className="rounded-md border border-slate-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">Toutes (ET)</option>
              <option value="any">Au moins une (OU)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// Champs dynamiques de la recette de calcul, réutilisés dans le wizard d'import (columns =
// celles détectées à l'étape 1, avec suggestions de valeurs tirées de l'aperçu) et dans
// l'édition seule de la recette (columns = null, saisie libre du nom de colonne).
function CalculationConfigFields({ form, onChange, columns, sampleRows }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Type de calcul</label>
        <select
          value={form.calc_type}
          onChange={(e) => onChange({ ...form, calc_type: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          {CALC_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {['sum', 'average', 'min', 'max'].includes(form.calc_type) && (
        <ColumnField
          label="Colonne à calculer"
          required
          value={form.source_column}
          onChange={(v) => onChange({ ...form, source_column: v })}
          columns={columns}
        />
      )}

      {form.calc_type === 'count_grouped' && (
        <ColumnField
          label="Colonne de regroupement"
          required
          value={form.group_by_column}
          onChange={(v) => onChange({ ...form, group_by_column: v })}
          columns={columns}
        />
      )}

      <FilterBuilder
        filters={form.filters}
        filterLogic={form.filter_logic}
        onChange={(patch) => onChange({ ...form, ...patch })}
        columns={columns}
        sampleRows={sampleRows}
        required={form.calc_type === 'ratio'}
      />

      <div>
        <ColumnField
          label="Colonne de période (optionnel)"
          value={form.period_column}
          onChange={(v) => onChange({ ...form, period_column: v })}
          columns={columns}
          placeholder="Aucune — préciser la période manuellement"
        />
        <p className="mt-1 text-xs text-slate-400">
          Si le fichier contient une colonne de date/période, sélectionnez-la pour regrouper
          automatiquement le calcul par période. Sinon, laissez vide : la période sera précisée
          manuellement à chaque import.
        </p>
      </div>
    </div>
  );
}

// Rendu partagé entre l'aperçu (dry-run) et le résultat final d'un apply : mêmes champs,
// count_grouped affichant une répartition plutôt qu'une valeur unique.
function ImportResultSummary({ data, unit }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">
        <span className="font-medium text-emerald-700">{data.rows_processed}</span> ligne
        {data.rows_processed > 1 ? 's' : ''} traitée{data.rows_processed > 1 ? 's' : ''} sur {data.rows_total}
        {data.rows_rejected > 0 && (
          <>
            {' '}
            · <span className="font-medium text-red-700">{data.rows_rejected}</span> rejetée
            {data.rows_rejected > 1 ? 's' : ''}
          </>
        )}
      </p>

      <div className="space-y-2">
        {data.periods.map((period, index) => (
          <div key={index} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">{period.period_label}</span>
              {!period.grouped_counts && (
                <span className="text-sm font-semibold text-slate-900">
                  {period.value ?? '—'} {unit || ''}
                </span>
              )}
            </div>

            {period.grouped_counts && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {Object.entries(period.grouped_counts).map(([key, count]) => (
                  <li key={key} className="flex items-center justify-between">
                    <span>{key}</span>
                    <span className="font-medium text-slate-800">{count}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-1 text-xs text-slate-500">
              {period.rows_total} ligne{period.rows_total > 1 ? 's' : ''}
              {period.rows_rejected > 0 ? `, ${period.rows_rejected} rejetée${period.rows_rejected > 1 ? 's' : ''}` : ''}
            </p>

            {!period.persisted && period.skip_reason && (
              <p className="mt-1 text-xs text-amber-600">{period.skip_reason}</p>
            )}

            {period.rejected_details?.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs font-medium text-red-600">
                  Voir le détail des lignes rejetées
                </summary>
                <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                  {period.rejected_details.map((detail, i) => (
                    <li key={i}>
                      Ligne {detail.row_index} : {detail.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Assistant d'import générique en 3 étapes : dépôt du fichier, configuration (ou réemploi)
// de la recette de calcul avec aperçu, puis application réelle et résumé.
function ImportWizardModal({ kpi, onClose, onImported }) {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [importData, setImportData] = useState(null);

  const [existingConfig, setExistingConfig] = useState(undefined); // undefined=chargement, null=aucune
  const [configMode, setConfigMode] = useState('edit'); // 'reuse' | 'edit'
  const [configForm, setConfigForm] = useState(EMPTY_CONFIG_FORM);
  const [manualPeriod, setManualPeriod] = useState('');
  const [configError, setConfigError] = useState('');
  const [configWarning, setConfigWarning] = useState('');
  const [applying, setApplying] = useState(false);
  const [suggested, setSuggested] = useState(false);

  const [livePreview, setLivePreview] = useState(null);
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);
  const [livePreviewError, setLivePreviewError] = useState('');

  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get(`/kpis/${kpi.id}/calculation-config`)
      .then(({ data }) => {
        setExistingConfig(data);
        setConfigForm(configToForm(data));
        setConfigMode('reuse');
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setExistingConfig(null);
          setConfigMode('edit');
        }
      });
  }, [kpi.id]);

  // Pré-remplit la recette dès que le fichier est analysé, quand ce KPI n'a encore aucune
  // configuration : la colonne de période est repérée par son nom, et une recette de type
  // ratio/moyenne est proposée si une colonne s'y prête clairement — l'utilisateur garde la
  // main pour tout ajuster, mais part d'un formulaire déjà rempli plutôt que vide.
  useEffect(() => {
    if (!importData || existingConfig === undefined || existingConfig) return;
    const periodColumn = detectPeriodColumn(importData.columns);
    const calcSuggestion = detectCalcSuggestion(importData.columns, importData.sample, periodColumn);
    const guess = { ...(periodColumn ? { period_column: periodColumn } : {}), ...(calcSuggestion || {}) };
    if (Object.keys(guess).length > 0) {
      setSuggested(true);
      setConfigForm((prev) => ({ ...prev, ...guess }));
    }
  }, [importData, existingConfig]);

  function handleFileChange(selected) {
    if (!selected) return;
    setFile(selected);
    setUploadError('');
    setImportData(null);
    setSuggested(false);
  }

  function handleDownloadTemplate() {
    exportToCsv('modele-import-kpi.csv', TEMPLATE_HEADERS, buildTemplateRows());
  }

  async function uploadFile(sheetName) {
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kpi_id', kpi.id);
      if (sheetName) formData.append('sheet_name', sheetName);
      const { data } = await api.post('/kpi-imports', formData);
      setImportData(data);
    } catch (err) {
      setUploadError(err.response?.data?.error || "Impossible d'importer ce fichier.");
    } finally {
      setUploading(false);
    }
  }

  function handleSheetChange(sheetName) {
    if (!importData || sheetName === importData.sheet_used) return;
    uploadFile(sheetName);
  }

  function configPayload() {
    return {
      calc_type: configForm.calc_type,
      source_column: configForm.source_column || null,
      filters: configForm.filters,
      filter_logic: configForm.filter_logic,
      group_by_column: configForm.group_by_column || null,
      period_column: configForm.period_column || null,
    };
  }

  const periodReady = Boolean(configForm.period_column || manualPeriod);
  const configComplete = configMode === 'reuse' ? true : isConfigComplete(configForm);
  const canProceed = configComplete && periodReady;

  // Aperçu live : recalcule à chaque changement de champ via /evaluate, qui n'enregistre
  // rien (ni la recette, ni de valeur) — contrairement à l'ancienne version qui exigeait de
  // sauvegarder la recette avant de pouvoir cliquer "Aperçu". Débounce léger pour ne pas
  // spammer l'API à chaque frappe dans le champ "Valeur".
  useEffect(() => {
    if (step !== 2 || !importData || !canProceed) {
      setLivePreview(null);
      setLivePreviewError('');
      return undefined;
    }

    const timer = setTimeout(() => {
      setLivePreviewLoading(true);
      setLivePreviewError('');
      const body = { ...configPayload() };
      if (!configForm.period_column) {
        body.period_date = manualPeriod ? `${manualPeriod}-01` : undefined;
      }
      api
        .post(`/kpi-imports/${importData.import.id}/evaluate`, body)
        .then(({ data }) => setLivePreview(data))
        .catch((err) => {
          setLivePreview(null);
          setLivePreviewError(err.response?.data?.error || "Impossible de calculer l'aperçu.");
        })
        .finally(() => setLivePreviewLoading(false));
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, importData, configForm, manualPeriod, canProceed]);

  async function handleValidate() {
    setConfigError('');
    setApplying(true);
    try {
      const { data: savedConfig } = await api.post(`/kpis/${kpi.id}/calculation-config`, configPayload());
      setConfigWarning(savedConfig.warning || '');
      const body = { dry_run: false };
      if (!configForm.period_column) {
        body.period_date = manualPeriod ? `${manualPeriod}-01` : undefined;
      }
      const { data } = await api.post(`/kpi-imports/${importData.import.id}/apply`, body);
      setResult(data);
      onImported();
      setStep(3);
    } catch (err) {
      setConfigError(err.response?.data?.error || "Impossible d'appliquer le calcul.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Importer un fichier</h2>
            <p className="text-sm text-slate-500">{kpi.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 flex items-center text-xs font-medium text-slate-400">
          {['Fichier', 'Calcul', 'Résultat'].map((label, index) => {
            const stepNumber = index + 1;
            const active = step === stepNumber;
            const done = step > stepNumber;
            return (
              <div key={label} className="flex items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    active ? 'bg-primary text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check size={12} /> : stepNumber}
                </span>
                <span className={`mx-1.5 ${active ? 'text-slate-700' : ''}`}>{label}</span>
                {stepNumber < 3 && <span className="mr-1.5 h-px w-4 bg-slate-200" />}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">
                Pas encore de fichier prêt ? Téléchargez un modèle et adaptez-le : gardez seulement les colonnes utiles
                à votre calcul.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Download size={14} />
                Modèle
              </button>
            </div>

            {uploadError && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{uploadError}</p>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFileChange(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary-50' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload size={24} className="text-slate-400" />
              {file ? (
                <p className="text-sm font-medium text-slate-700">{file.name}</p>
              ) : (
                <p className="text-sm text-slate-500">Glissez-déposez un fichier CSV ou Excel ici, ou cliquez pour parcourir</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>

            {file && !importData && (
              <button
                type="button"
                onClick={() => uploadFile()}
                disabled={uploading}
                className="mt-4 w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                {uploading ? 'Analyse en cours...' : 'Analyser le fichier'}
              </button>
            )}

            {importData?.available_sheets?.length > 1 && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Onglet à utiliser</label>
                <select
                  value={importData.sheet_used}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  disabled={uploading}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {importData.available_sheets.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {importData && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700">
                  {importData.row_count} ligne{importData.row_count > 1 ? 's' : ''} détectée
                  {importData.row_count > 1 ? 's' : ''}, {importData.columns.length} colonne
                  {importData.columns.length > 1 ? 's' : ''}
                </p>
                <div className="mt-2 max-h-56 overflow-auto rounded-md border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-500">
                      <tr>
                        {importData.columns.map((col) => (
                          <th key={col} className="whitespace-nowrap px-2 py-1.5 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importData.sample.map((row, index) => (
                        <tr key={index}>
                          {importData.columns.map((col) => (
                            <td key={col} className="whitespace-nowrap px-2 py-1.5 text-slate-600">
                              {row[col] === null || row[col] === undefined || row[col] === '' ? '—' : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700"
                >
                  Continuer
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            {existingConfig === undefined ? (
              <div className="space-y-2">
                {[0, 1].map((key) => (
                  <div key={key} className="h-8 animate-pulse rounded-md bg-slate-100" />
                ))}
              </div>
            ) : (
              <>
                {existingConfig && configMode === 'reuse' && (
                  <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-700">Configuration existante</p>
                    <p className="mt-1 text-sm text-slate-600">{CALC_TYPE_LABELS[existingConfig.calc_type]}</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                      {existingConfig.source_column && <li>Colonne à calculer : {existingConfig.source_column}</li>}
                      {existingConfig.group_by_column && <li>Colonne de regroupement : {existingConfig.group_by_column}</li>}
                      {describeFiltersShort(existingConfig.filters, existingConfig.filter_logic) && (
                        <li>Conditions : {describeFiltersShort(existingConfig.filters, existingConfig.filter_logic)}</li>
                      )}
                      <li>Colonne de période : {existingConfig.period_column || 'aucune (saisie manuelle)'}</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => setConfigMode('edit')}
                      className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Créer une nouvelle configuration
                    </button>
                  </div>
                )}

                {configMode === 'edit' && (
                  <>
                    {existingConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfigMode('reuse');
                          setConfigForm(configToForm(existingConfig));
                        }}
                        className="mb-3 text-xs font-medium text-primary hover:underline"
                      >
                        ← Revenir à la configuration existante
                      </button>
                    )}
                    {suggested && (
                      <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                        Configuration pré-remplie automatiquement d'après votre fichier — vérifiez et ajustez si besoin.
                      </p>
                    )}
                    <CalculationConfigFields
                      form={configForm}
                      onChange={setConfigForm}
                      columns={importData.columns}
                      sampleRows={importData.sample}
                    />
                  </>
                )}

                {!configForm.period_column && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Période de cet import</label>
                    <input
                      type="month"
                      value={manualPeriod}
                      onChange={(e) => setManualPeriod(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Aucune colonne de période sélectionnée : toutes les lignes de ce fichier seront rattachées à cette
                      période unique.
                    </p>
                  </div>
                )}

                {configError && (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{configError}</p>
                )}
                {configWarning && (
                  <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {configWarning}
                  </p>
                )}

                {livePreviewError && (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {livePreviewError}
                  </p>
                )}

                {canProceed && (livePreviewLoading || livePreview) && (
                  <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      Aperçu {livePreviewLoading && '— calcul en cours...'}
                    </p>
                    {livePreview && <ImportResultSummary data={livePreview} unit={kpi.unit} />}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft size={16} />
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleValidate}
                    disabled={applying || !canProceed}
                    className="flex-1 rounded-md bg-primary py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                  >
                    {applying ? 'Validation...' : "Valider l'import"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && result && (
          <div>
            <p className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={16} />
              Import appliqué avec succès
            </p>
            <ImportResultSummary data={result} unit={kpi.unit} />
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Édition seule de la recette de calcul, hors import — accessible depuis les paramètres du
// KPI pour corriger la recette sans devoir redéposer un fichier.
function CalculationConfigModal({ kpi, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_CONFIG_FORM);
  const [hasExisting, setHasExisting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get(`/kpis/${kpi.id}/calculation-config`)
      .then(({ data }) => {
        setForm(configToForm(data));
        setHasExisting(true);
      })
      .catch((err) => {
        if (err.response?.status !== 404) setError('Impossible de charger la configuration existante.');
      })
      .finally(() => setLoading(false));
  }, [kpi.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setWarning('');
    setSubmitting(true);
    try {
      const payload = {
        calc_type: form.calc_type,
        source_column: form.source_column || null,
        filters: form.filters,
        filter_logic: form.filter_logic,
        group_by_column: form.group_by_column || null,
        period_column: form.period_column || null,
      };
      const { data } = await api.post(`/kpis/${kpi.id}/calculation-config`, payload);
      onSaved();
      if (data.warning) {
        setWarning(data.warning);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la configuration.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Configuration du calcul</h2>
            <p className="text-sm text-slate-500">{kpi.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-8 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!hasExisting && (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Aucune configuration enregistrée pour l'instant : elle sera utilisée au prochain import de fichier.
              </p>
            )}

            <CalculationConfigFields form={form} onChange={setForm} columns={null} sampleRows={null} />

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {warning && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ImportsHistoryTable({ imports, kpi }) {
  if (imports === null) {
    return (
      <div className="space-y-2">
        {[0, 1].map((key) => (
          <div key={key} className="h-8 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    );
  }

  if (imports.length === 0) {
    return <p className="py-3 text-sm text-slate-400">Aucun import pour l'instant.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Fichier</th>
            <th className="py-2 pr-3">Importé par</th>
            <th className="py-2 pr-3">Lignes</th>
            <th className="py-2 pr-3">Périodes affectées</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {imports.map((imp) => (
            <tr key={imp.id}>
              <td className="py-2 pr-3 whitespace-nowrap text-slate-700">{formatDate(imp.imported_at)}</td>
              <td className="py-2 pr-3 text-slate-600">{imp.file_name || '—'}</td>
              <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{imp.imported_by_user?.full_name || '—'}</td>
              <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{imp.row_count}</td>
              <td className="py-2 pr-3 text-slate-600">
                {imp.affected_periods.length > 0
                  ? imp.affected_periods.map((p) => formatPeriodShort(p, kpi.frequency)).join(', ')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Vue dédiée aux KPI 'count_grouped' : pas de point de tendance (jamais persisté dans
// kpi_records, cf. backend), donc recalculée à la volée depuis le dernier import à chaque
// affichage plutôt que lue depuis kpi.records.
function DistributionView({ kpi }) {
  const [data, setData] = useState(undefined); // undefined = chargement, null = erreur/absent
  const [error, setError] = useState('');
  const [periodIndex, setPeriodIndex] = useState(0);

  useEffect(() => {
    setData(undefined);
    setError('');
    api
      .get(`/kpis/${kpi.id}/distribution`)
      .then(({ data }) => {
        setData(data);
        setPeriodIndex(Math.max(0, data.periods.length - 1));
      })
      .catch((err) => {
        setData(null);
        setError(err.response?.data?.error || 'Impossible de charger la répartition.');
      });
  }, [kpi.id]);

  if (data === undefined) {
    return <div className="h-48 animate-pulse rounded-md bg-slate-100" />;
  }

  if (!data || data.periods.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-center text-sm text-slate-400">
        {error || 'Aucune donnée importée pour ce KPI.'}
      </div>
    );
  }

  const period = data.periods[periodIndex];
  const chartData = Object.entries(period.grouped_counts).map(([name, count]) => ({ name, count }));

  return (
    <div>
      {data.periods.length > 1 && (
        <select
          value={periodIndex}
          onChange={(e) => setPeriodIndex(Number(e.target.value))}
          className="mb-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
        >
          {data.periods.map((p, index) => (
            <option key={index} value={index}>
              {p.period_label}
            </option>
          ))}
        </select>
      )}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: MUTED_COLOR, fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: MUTED_COLOR, fontSize: 11 }} width={30} allowDecimals={false} />
            <Tooltip
              formatter={(val) => [val, kpi.calculation_config?.group_by_column || 'Nombre de lignes']}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }}
            />
            <Bar dataKey="count" fill={LINE_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-xs text-slate-400">
        {period.rows_total} ligne{period.rows_total > 1 ? 's' : ''} — {data.import.file_name || 'dernier import'}
      </p>
    </div>
  );
}

// Panneau "preuve" ouvert au clic sur un point du graphique de tendance : le calcul en
// langage clair, puis les lignes brutes de kpi_raw_rows qui l'ont produit — colonnes
// dynamiques (clés de row_data), paginées côté backend, export CSV complet (toutes les
// pages, pas seulement celle affichée).
function RecordProofModal({ kpi, record, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    setData(null);
    setError('');
    api
      .get(`/kpis/${kpi.id}/records/${record.id}/proof`, { params: { page, page_size: pageSize } })
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.error || 'Impossible de charger le détail de ce calcul.'));
  }, [kpi.id, record.id, page]);

  async function handleExportCsv() {
    if (!data) return;
    setExporting(true);
    try {
      const allRows = [];
      let currentPage = 1;
      let total = data.rows_total;
      while (allRows.length < total) {
        const { data: pageData } = await api.get(`/kpis/${kpi.id}/records/${record.id}/proof`, {
          params: { page: currentPage, page_size: 200 },
        });
        if (pageData.rows.length === 0) break;
        allRows.push(...pageData.rows);
        total = pageData.rows_total;
        currentPage += 1;
      }
      exportToCsv(
        `${sanitizeFilename(kpi.name)}-preuve-${record.period_date}.csv`,
        data.columns,
        allRows.map((row) =>
          data.columns.map((col) => (row.row_data[col] === null || row.row_data[col] === undefined ? '' : String(row.row_data[col])))
        )
      );
    } finally {
      setExporting(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.rows_total / data.page_size)) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Détail du calcul</h2>
            <p className="text-sm text-slate-500">
              {kpi.name} — {formatPeriodShort(record.period_date, kpi.frequency)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!error && !data && (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-8 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">{data.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                Import : {data.import.file_name || 'fichier'} — {formatDate(data.import.imported_at)} par{' '}
                {data.import.imported_by_user?.full_name || 'un utilisateur'}
              </p>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {data.rows_total} ligne{data.rows_total > 1 ? 's' : ''} au total
              </p>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exporting}
                className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Download size={14} />
                {exporting ? 'Export...' : 'Exporter en CSV'}
              </button>
            </div>

            <div className="max-h-80 overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr>
                    {data.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-2 py-1.5 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((row) => (
                    <tr key={row.row_index}>
                      {data.columns.map((col) => (
                        <td key={col} className="whitespace-nowrap px-2 py-1.5 text-slate-600">
                          {row.row_data[col] === null || row.row_data[col] === undefined || row.row_data[col] === ''
                            ? '—'
                            : String(row.row_data[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Précédent
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} sur {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  kpi,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
  onOpenRecordModal,
  onDeleteRecord,
  onOpenImportModal,
  onOpenConfigModal,
  onViewProof,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showImports, setShowImports] = useState(false);
  const [imports, setImports] = useState(null);
  const [importsLoading, setImportsLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportError, setExportError] = useState('');
  const chartRef = useRef(null);
  const records = [...kpi.records].sort((a, b) => (a.period_date > b.period_date ? 1 : -1));
  // La valeur mise en avant sur la carte est la moyenne de toutes les périodes enregistrées,
  // pas la dernière valeur du graphique — plus représentative que le dernier point seul,
  // qui peut être un pic isolé. Le graphique en dessous continue d'afficher chaque période.
  const averageValue = records.length > 0 ? Number((records.reduce((sum, r) => sum + r.value, 0) / records.length).toFixed(2)) : null;
  const targetDirection = kpi.target_direction || 'min';
  const status = getKpiStatus(averageValue, kpi.target, targetDirection);
  const StatusIcon = status === 'good' ? CheckCircle2 : status === 'bad' ? AlertCircle : null;
  const hasTarget = kpi.target !== null && kpi.target !== undefined;
  const hasEnoughForChart = records.length >= 2;
  const isImportBased = kpi.calculation_type === 'import';
  const isCountGrouped = kpi.calculation_config?.calc_type === 'count_grouped';
  const canExportChart = isCountGrouped || hasEnoughForChart;

  function loadImportsIfNeeded() {
    if (imports !== null || importsLoading) return;
    setImportsLoading(true);
    api
      .get(`/kpis/${kpi.id}/imports`)
      .then(({ data }) => setImports(data))
      .catch(() => setImports([]))
      .finally(() => setImportsLoading(false));
  }

  function handleChartClick(chartEvent) {
    const point = chartEvent?.activePayload?.[0]?.payload;
    if (point) onViewProof(kpi, point);
  }

  async function handleExportChartPng() {
    setExportMenuOpen(false);
    setExportError('');
    if (!chartRef.current) return;

    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${sanitizeFilename(kpi.name)}-graphique.png`;
      link.click();
    } catch {
      setExportError("Impossible d'exporter le graphique.");
    }
  }

  function handleExportDataCsv() {
    setExportMenuOpen(false);
    const sortedRecords = [...kpi.records].sort((a, b) => (a.period_date < b.period_date ? 1 : -1));
    exportToCsv(
      `${sanitizeFilename(kpi.name)}-valeurs.csv`,
      ['Période', 'Valeur', 'Source', 'Commentaire'],
      sortedRecords.map((record) => [
        formatDate(record.period_date),
        record.value,
        SOURCE_LABELS[record.source] || record.source,
        record.comment || '',
      ])
    );
  }

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

        <div className="flex shrink-0 items-start gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              aria-label="Exporter"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            >
              <Download size={18} />
            </button>

            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportChartPng}
                    disabled={!canExportChart}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                  >
                    <ImageIcon size={14} />
                    Exporter le graphique (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportDataCsv}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileText size={14} />
                    Exporter les données (CSV)
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="relative">
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
                <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
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
                  {isImportBased && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleMenu(null);
                        onOpenConfigModal(kpi);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings size={14} />
                      Configurer le calcul
                    </button>
                  )}
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
      </div>

      {exportError && <p className="mt-1 text-xs text-red-600">{exportError}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        {averageValue !== null ? (
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-semibold ${KPI_STATUS_STYLES[status]}`}>
              {averageValue} {kpi.unit || ''}
            </span>
            <span className="text-xs text-slate-400">(moyenne)</span>
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
        {isImportBased ? (
          <button
            type="button"
            onClick={() => onOpenImportModal(kpi)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload size={14} />
            Importer un fichier
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenRecordModal(kpi, null)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} />
            Saisir une valeur
          </button>
        )}
      </div>

      <div ref={chartRef} className="mt-4 bg-white">
        {isCountGrouped ? (
          <DistributionView kpi={kpi} />
        ) : (
          <div className="h-48">
            {hasEnoughForChart ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={records}
                    margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
                    onClick={isImportBased ? handleChartClick : undefined}
                    style={isImportBased ? { cursor: 'pointer' } : undefined}
                  >
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
                {isImportBased && (
                  <p className="mt-1 text-center text-xs text-slate-400">Cliquez sur un point pour voir le détail</p>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Pas assez de données pour un graphique
              </div>
            )}
          </div>
        )}
      </div>

      {!isCountGrouped && (
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
      )}

      {isImportBased && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => {
              setShowImports((prev) => !prev);
              loadImportsIfNeeded();
            }}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {showImports ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <History size={14} />
            Historique des imports
          </button>

          {showImports && (
            <div className="mt-2">
              <ImportsHistoryTable imports={imports} kpi={kpi} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Kpis() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordModal, setRecordModal] = useState(null); // { kpi, record } — record null = création
  const [formModal, setFormModal] = useState(null); // null fermé, 'new' création, objet kpi édition
  const [importModal, setImportModal] = useState(null); // le kpi en cours d'import, ou null
  const [configModal, setConfigModal] = useState(null); // le kpi dont on édite la recette, ou null
  const [proofModal, setProofModal] = useState(null); // { kpi, record } — preuve derrière un point du graphique
  const [openMenuId, setOpenMenuId] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

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

  // Un import ou une config de calcul peuvent changer à la fois les records ET
  // calculation_config (ex : premier import d'un KPI en count_grouped) — un refetch complet
  // du KPI est plus simple et plus sûr qu'une fusion locale partielle des deux à la fois.
  async function refreshKpi(kpiId) {
    try {
      const { data } = await api.get(`/kpis/${kpiId}`);
      setKpis((prev) => prev.map((kpi) => (kpi.id === kpiId ? data : kpi)));
    } catch {
      // best effort — la carte garde son état précédent si le refetch échoue
    }
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

  // Même schéma que le certificat de signature (DocumentDetail.jsx) : ouvre le PDF dans un
  // nouvel onglet plutôt qu'un téléchargement forcé, pour permettre un aperçu avant impression.
  async function handleGenerateReport() {
    setError('');
    setGeneratingReport(true);
    try {
      const response = await api.get('/kpis/report', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
    } catch {
      setError('Impossible de générer le rapport.');
    } finally {
      setGeneratingReport(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">KPIs</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={generatingReport || kpis.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            <FileText size={18} />
            {generatingReport ? 'Génération...' : 'Générer rapport PDF'}
          </button>
          <button
            type="button"
            onClick={() => setFormModal('new')}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
          >
            <Plus size={18} />
            Nouveau KPI
          </button>
        </div>
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
              onOpenImportModal={setImportModal}
              onOpenConfigModal={setConfigModal}
              onViewProof={(kpiArg, record) => setProofModal({ kpi: kpiArg, record })}
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

      {importModal && (
        <ImportWizardModal
          kpi={importModal}
          onClose={() => setImportModal(null)}
          onImported={() => refreshKpi(importModal.id)}
        />
      )}

      {configModal && (
        <CalculationConfigModal kpi={configModal} onClose={() => setConfigModal(null)} onSaved={() => refreshKpi(configModal.id)} />
      )}

      {proofModal && (
        <RecordProofModal kpi={proofModal.kpi} record={proofModal.record} onClose={() => setProofModal(null)} />
      )}
    </div>
  );
}
