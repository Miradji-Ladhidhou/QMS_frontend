import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, Grid3x3, Loader2, Pencil, Plus, Trash2, UserCheck, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf } from '../lib/pdfExport.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useSort } from '../lib/useSort.js';
import SortSelect from '../components/SortSelect.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

const TRAINING_SORT_OPTIONS = [
  { key: 'title', label: 'titre' },
  { key: 'type', label: 'type' },
  { key: 'last_completed', label: 'dernière réalisation' },
  { key: 'records_count', label: 'nombre de réalisations' },
];

function getTrainingSortValue(training, key) {
  if (key === 'records_count') return training.records.length;
  if (key === 'last_completed') {
    return training.records.length ? training.records[training.records.length - 1]?.completed_at : null;
  }
  return training[key];
}

function NewTrainingModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', type: '', frequency_months: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title: form.title,
        type: form.type || undefined,
        frequency_months: form.frequency_months ? Number(form.frequency_months) : undefined,
      };
      const { data } = await api.post('/trainings', payload);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la formation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle formation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <input
              type="text"
              placeholder="Interne, externe, en ligne, certification..."
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence de recyclage (mois)</label>
            <input
              type="number"
              min="1"
              placeholder="Laisser vide si formation ponctuelle"
              value={form.frequency_months}
              onChange={(e) => updateField('frequency_months', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer la formation'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditTrainingModal({ training, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: training.title,
    type: training.type || '',
    frequency_months: training.frequency_months || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.patch(`/trainings/${training.id}`, {
        title: form.title,
        type: form.type || null,
        frequency_months: form.frequency_months ? Number(form.frequency_months) : null,
      });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier la formation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier la formation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <input
              type="text"
              placeholder="Interne, externe, en ligne, certification..."
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence de recyclage (mois)</label>
            <input
              type="number"
              min="1"
              placeholder="Laisser vide si formation ponctuelle"
              value={form.frequency_months}
              onChange={(e) => updateField('frequency_months', e.target.value)}
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

function personName(record) {
  return record.user?.full_name || record.employee?.full_name || 'Personne inconnue';
}

function EditRecordModal({ training, record, onClose, onUpdated }) {
  const [completedAt, setCompletedAt] = useState(record.completed_at);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.patch(`/trainings/${training.id}/records/${record.id}`, {
        completed_at: completedAt,
      });
      onUpdated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette réalisation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Modifier la réalisation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          {training.title} — {personName(record)}
        </p>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de réalisation</label>
            <input
              type="date"
              required
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
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

function RecordModal({ training, users, employees, onClose, onRecorded }) {
  const [source, setSource] = useState('user');
  const [personId, setPersonId] = useState('');
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSourceChange(next) {
    setSource(next);
    setPersonId('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!personId) {
      setError(source === 'user' ? 'Sélectionnez un utilisateur.' : 'Sélectionnez une personne.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload = source === 'user' ? { user_id: personId } : { employee_id: personId };
      const { data } = await api.post(`/trainings/${training.id}/records`, { ...payload, completed_at: completedAt });
      onRecorded(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la réalisation.");
    } finally {
      setSubmitting(false);
    }
  }

  const options = source === 'user' ? users : employees;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Enregistrer une réalisation</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">{training.title}</p>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cette personne a-t-elle un compte ?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSourceChange('user')}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  source === 'user' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Utilisateur du compte
              </button>
              <button
                type="button"
                onClick={() => handleSourceChange('employee')}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  source === 'employee' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Personnel sans compte
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {source === 'user' ? 'Utilisateur' : 'Personne'}
            </label>
            <select
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Sélectionner...</option>
              {options.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
            </select>
            {source === 'employee' && options.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">Aucune personne enregistrée — ajoutez-la depuis Personnel.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de réalisation</label>
            <input
              type="date"
              required
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
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

export default function Trainings() {
  const currentUser = useCurrentUser();
  const canManage = isManagerRole(currentUser?.role);
  const [trainings, setTrainings] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [recordingTraining, setRecordingTraining] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [trainingsRes, usersRes, employeesRes] = await Promise.all([
        api.get('/trainings'),
        api.get('/users'),
        api.get('/employees'),
      ]);
      setTrainings(trainingsRes.data);
      setUsers(usersRes.data);
      // GET /employees renvoie aussi les inactifs (utile à la page de gestion du personnel) —
      // ce sélecteur d'enregistrement de réalisation ne doit proposer que les actifs.
      setEmployees(employeesRes.data.filter((employee) => employee.is_active));
    } catch {
      setError('Impossible de charger les formations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleTrainingCreated(newTraining) {
    setTrainings((prev) => [...prev, { ...newTraining, records: [] }]);
    setIsNewModalOpen(false);
  }

  function handleRecordCreated(record) {
    setTrainings((prev) =>
      prev.map((training) =>
        training.id === recordingTraining.id ? { ...training, records: [...training.records, record] } : training
      )
    );
    setRecordingTraining(null);
  }

  function handleTrainingUpdated(updated) {
    setTrainings((prev) =>
      prev.map((training) => (training.id === updated.id ? { ...training, ...updated } : training))
    );
    setEditingTraining(null);
  }

  async function handleDeleteTraining(training) {
    if (
      !window.confirm(
        `Supprimer définitivement la formation "${training.title}" ? Les ${training.records.length} réalisation(s) associée(s) seront supprimées avec elle.`
      )
    )
      return;

    try {
      await api.delete(`/trainings/${training.id}`);
      setTrainings((prev) => prev.filter((item) => item.id !== training.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer cette formation.');
    }
  }

  function handleRecordUpdated(training, updated) {
    setTrainings((prev) =>
      prev.map((item) =>
        item.id === training.id
          ? { ...item, records: item.records.map((record) => (record.id === updated.id ? updated : record)) }
          : item
      )
    );
    setEditingRecord(null);
  }

  async function handleDeleteRecord(training, record) {
    if (!window.confirm(`Supprimer la réalisation de ${personName(record)} du ${formatDate(record.completed_at)} ?`))
      return;

    try {
      await api.delete(`/trainings/${training.id}/records/${record.id}`);
      setTrainings((prev) =>
        prev.map((item) =>
          item.id === training.id ? { ...item, records: item.records.filter((r) => r.id !== record.id) } : item
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer cette réalisation.');
    }
  }

  function handleExportCsv() {
    const headers = ['Formation', 'Type', 'Personne', 'Statut personnel', 'Date de réalisation'];
    const rows = trainings.flatMap((training) =>
      training.records.map((record) => [
        training.title,
        training.type || '',
        personName(record),
        record.employee_id ? 'Sans compte' : 'Compte',
        formatDate(record.completed_at),
      ])
    );
    exportToCsv(`formations-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'training', label: 'Formation', width: 0.3 },
        { key: 'type', label: 'Type', width: 0.15 },
        { key: 'person', label: 'Personne', width: 0.25 },
        { key: 'status', label: 'Statut', width: 0.13 },
        { key: 'completed_at', label: 'Réalisation', width: 0.17 },
      ];
      const rows = trainings.flatMap((training) =>
        training.records.map((record) => ({
          training: training.title,
          type: training.type || '',
          person: personName(record),
          status: record.employee_id ? 'Sans compte' : 'Compte',
          completed_at: formatDate(record.completed_at),
        }))
      );
      await exportToPdf(`formations-${new Date().toISOString().slice(0, 10)}.pdf`, 'Formations', columns, rows, {
        subtitle: `${rows.length} réalisation${rows.length > 1 ? 's' : ''}`,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  const hasAnyRecord = trainings.some((training) => training.records.length > 0);

  const { sorted: sortedTrainings, sortKey, direction, setSortKey, toggleSort } = useSort(
    trainings,
    getTrainingSortValue,
    'title',
    'asc'
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Formations</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!hasAnyRecord}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf || !hasAnyRecord}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <Link
            to="/trainings/matrix"
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Grid3x3 size={18} />
            Matrice des compétences
          </Link>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plus size={18} />
            Nouvelle formation
          </button>
        </div>
      </div>

      <div className="mt-4">
        <SortSelect
          options={TRAINING_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : trainings.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune formation pour l'instant.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTrainings.map((training) => {
            const isExpanded = expandedId === training.id;

            return (
              <div key={training.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{training.title}</p>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingTraining(training)}
                        aria-label="Modifier la formation"
                        className="p-1 text-slate-400 hover:text-primary"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTraining(training)}
                        aria-label="Supprimer la formation"
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {training.type && <p className="mt-1 text-sm text-slate-500">{training.type}</p>}
                <p className="mt-2 text-sm text-slate-600">
                  {training.frequency_months
                    ? `Renouvellement tous les ${training.frequency_months} mois`
                    : 'Formation ponctuelle'}
                </p>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : training.id)}
                  disabled={training.records.length === 0}
                  className="mt-1 flex items-center gap-1 text-sm text-slate-600 hover:text-primary disabled:cursor-default disabled:hover:text-slate-600"
                >
                  {training.records.length} réalisation{training.records.length > 1 ? 's' : ''}
                  {training.records.length > 0 && (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
                {!isExpanded && training.records.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Dernière : {formatDate(training.records[training.records.length - 1]?.completed_at)}
                  </p>
                )}

                {isExpanded && (
                  <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                    {training.records.map((record) => (
                      <li key={record.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-slate-700">
                          {personName(record)}
                          {record.employee_id && (
                            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                              Sans compte
                            </span>
                          )}
                          {' — '}
                          {formatDate(record.completed_at)}
                        </span>
                        {canManage && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingRecord({ training, record })}
                              aria-label="Modifier la réalisation"
                              className="p-1 text-slate-400 hover:text-primary"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(training, record)}
                              aria-label="Supprimer la réalisation"
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => setRecordingTraining(training)}
                  className="mt-4 flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserCheck size={16} />
                  Enregistrer une réalisation
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isNewModalOpen && <NewTrainingModal onClose={() => setIsNewModalOpen(false)} onCreated={handleTrainingCreated} />}

      {recordingTraining && (
        <RecordModal
          training={recordingTraining}
          users={users}
          employees={employees}
          onClose={() => setRecordingTraining(null)}
          onRecorded={handleRecordCreated}
        />
      )}

      {editingTraining && (
        <EditTrainingModal
          training={editingTraining}
          onClose={() => setEditingTraining(null)}
          onUpdated={handleTrainingUpdated}
        />
      )}

      {editingRecord && (
        <EditRecordModal
          training={editingRecord.training}
          record={editingRecord.record}
          onClose={() => setEditingRecord(null)}
          onUpdated={(updated) => handleRecordUpdated(editingRecord.training, updated)}
        />
      )}
    </div>
  );
}
