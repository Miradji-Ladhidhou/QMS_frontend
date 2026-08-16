import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid3x3, Plus, UserCheck, X } from 'lucide-react';
import { api } from '../lib/api.js';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
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

function RecordModal({ training, users, onClose, onRecorded }) {
  const [userId, setUserId] = useState('');
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!userId) {
      setError('Sélectionnez un utilisateur.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.post(`/trainings/${training.id}/records`, {
        user_id: userId,
        completed_at: completedAt,
      });
      onRecorded(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la réalisation.");
    } finally {
      setSubmitting(false);
    }
  }

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
            <label className="mb-1 block text-sm font-medium text-slate-700">Utilisateur</label>
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Sélectionner...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
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
  const [trainings, setTrainings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [recordingTraining, setRecordingTraining] = useState(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [trainingsRes, usersRes] = await Promise.all([api.get('/trainings'), api.get('/users')]);
      setTrainings(trainingsRes.data);
      setUsers(usersRes.data);
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

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Formations</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
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

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
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
          {trainings.map((training) => (
            <div key={training.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="font-medium text-slate-900">{training.title}</p>
              {training.type && <p className="mt-1 text-sm text-slate-500">{training.type}</p>}
              <p className="mt-2 text-sm text-slate-600">
                {training.frequency_months
                  ? `Renouvellement tous les ${training.frequency_months} mois`
                  : 'Formation ponctuelle'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {training.records.length} réalisation{training.records.length > 1 ? 's' : ''}
              </p>
              {training.records.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Dernière : {formatDate(training.records[training.records.length - 1]?.completed_at)}
                </p>
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
          ))}
        </div>
      )}

      {isNewModalOpen && <NewTrainingModal onClose={() => setIsNewModalOpen(false)} onCreated={handleTrainingCreated} />}

      {recordingTraining && (
        <RecordModal
          training={recordingTraining}
          users={users}
          onClose={() => setRecordingTraining(null)}
          onRecorded={handleRecordCreated}
        />
      )}
    </div>
  );
}
