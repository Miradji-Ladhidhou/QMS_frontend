import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  FileSignature,
  Folder,
  FolderPlus,
  Grid3x3,
  List,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { exportToCsv } from '../lib/csvExport.js';
import { exportToPdf, exportToXlsx, exportToDrive, postForPdfDownload, getPdfDownload } from '../lib/pdfExport.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useSort } from '../lib/useSort.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import SortSelect from '../components/SortSelect.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// next_due_date est calculé et stocké côté serveur à chaque réalisation (voir POST
// /:id/records, addMonths(completed_at, frequency_months)) — même champ que celui utilisé par
// la Matrice des compétences, pour ne jamais afficher une notion de "retard" différente de la
// sienne sur cette page.
function countOverdueRecords(training, today) {
  return training.records.filter((record) => record.next_due_date && record.next_due_date < today).length;
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

const PERSON_KIND_LABEL = { user: 'Compte', employee: 'Sans compte' };

function personKey(kind, id) {
  return `${kind}:${id}`;
}

// Combine comptes et personnel sans compte en une seule liste triée, forme commune consommée
// par PersonChecklist (enregistrement groupé + fiche de participation).
function combinePeople(users, employees) {
  return [
    ...users.map((user) => ({ id: user.id, full_name: user.full_name, kind: 'user', training_exempt: user.training_exempt })),
    ...employees.map((employee) => ({
      id: employee.id,
      full_name: employee.full_name,
      kind: 'employee',
      training_exempt: employee.training_exempt,
    })),
  ].sort((a, b) => a.full_name.localeCompare(b.full_name, 'fr'));
}

// Coche à cocher partagée par RecordModal (enregistrement groupé) et AttendanceSheetModal
// (fiche de participation) : mêmes personnes, même geste de sélection.
function PersonChecklist({ users, employees, selected, onToggle, onSetSelected }) {
  const people = combinePeople(users, employees);
  const eligibleKeys = people.filter((p) => !p.training_exempt).map((p) => personKey(p.kind, p.id));
  const allEligibleSelected = eligibleKeys.length > 0 && eligibleKeys.every((key) => selected.has(key));

  function toggleAll() {
    onSetSelected(allEligibleSelected ? new Set() : new Set(eligibleKeys));
  }

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={allEligibleSelected}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
        />
        Tous les utilisateurs
      </label>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
        {people.length === 0 && <p className="p-2 text-sm text-slate-400">Aucune personne disponible.</p>}
        {people.map((person) => {
          const key = personKey(person.kind, person.id);
          return (
            <label
              key={key}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 ${
                person.training_exempt ? 'opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => onToggle(key)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="flex-1 text-slate-800">{person.full_name}</span>
              {person.kind === 'employee' && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                  Sans compte
                </span>
              )}
              {person.training_exempt && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Exclu</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
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

function NewTrainingModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    type: '',
    frequency_months: '',
    location: '',
    instructor: '',
    duration: '',
    description: '',
    category_id: '',
  });
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || undefined;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('training');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      title: form.title,
      type: form.type || undefined,
      frequency_months: form.frequency_months ? Number(form.frequency_months) : undefined,
      location: form.location || undefined,
      instructor: form.instructor || undefined,
      duration: form.duration || undefined,
      description: form.description || undefined,
      category_id: categoryId,
    };

    // onCreated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le handler du parent ne doit pas se faire passer pour un échec de création.
    let data;
    try {
      ({ data } = await api.post('/trainings', payload));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer la formation.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Durée</label>
              <input
                type="text"
                placeholder="Ex : 3h30, 2 jours"
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Formateur / intervenant</label>
            <input
              type="text"
              value={form.instructor}
              onChange={(e) => updateField('instructor', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet / contenu de la formation</label>
            <AutoTextarea
              rows={3}
              placeholder="Ce que couvre la formation, ses objectifs..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <CategoryVisibilityField
            categories={categories}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

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

function EditTrainingModal({ training, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: training.title,
    type: training.type || '',
    frequency_months: training.frequency_months || '',
    location: training.location || '',
    instructor: training.instructor || '',
    duration: training.duration || '',
    description: training.description || '',
    category_id: training.category_id || '',
  });
  const [isPrivate, setIsPrivate] = useState(Boolean(training.is_private_to_me));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let categoryId = form.category_id || null;
    if (isPrivate) {
      try {
        categoryId = await resolvePersonalCategoryId('training');
      } catch {
        setError('Impossible de préparer la visibilité personnelle.');
        setSubmitting(false);
        return;
      }
    }

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un
    // bug dans le handler du parent ne doit pas se faire passer pour un échec de modification.
    let data;
    try {
      ({ data } = await api.patch(`/trainings/${training.id}`, {
        title: form.title,
        type: form.type || null,
        frequency_months: form.frequency_months ? Number(form.frequency_months) : null,
        location: form.location || null,
        instructor: form.instructor || null,
        duration: form.duration || null,
        description: form.description || null,
        category_id: categoryId,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier la formation.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Durée</label>
              <input
                type="text"
                placeholder="Ex : 3h30, 2 jours"
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Formateur / intervenant</label>
            <input
              type="text"
              value={form.instructor}
              onChange={(e) => updateField('instructor', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Objet / contenu de la formation</label>
            <AutoTextarea
              rows={3}
              placeholder="Ce que couvre la formation, ses objectifs..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <CategoryVisibilityField
            categories={categories}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            isPrivate={isPrivate}
            onIsPrivateChange={setIsPrivate}
          />

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

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence.
    let data;
    try {
      ({ data } = await api.patch(`/trainings/${training.id}/records/${record.id}`, {
        completed_at: completedAt,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de modifier cette réalisation.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onUpdated(data);
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
  const [selected, setSelected] = useState(new Set());
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Renseigné après un enregistrement partiel (doublons ignorés) : le modal reste ouvert un
  // instant pour que le manager voie clairement qui a été ignoré, plutôt que de se fermer sans
  // rien dire — c'est exactement l'absence de retour qui a permis les doublons silencieux.
  const [skippedNames, setSkippedNames] = useState(null);

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resolveNames(ids, kind) {
    const source = kind === 'user' ? users : employees;
    return ids.map((id) => source.find((p) => p.id === id)?.full_name || '?');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selected.size === 0) {
      setError('Sélectionnez au moins une personne.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const userIds = [...selected].filter((key) => key.startsWith('user:')).map((key) => key.slice(5));
      const employeeIds = [...selected].filter((key) => key.startsWith('employee:')).map((key) => key.slice(9));
      const { data } = await api.post(`/trainings/${training.id}/records/bulk`, {
        user_ids: userIds,
        employee_ids: employeeIds,
        completed_at: completedAt,
      });

      const skipped = [
        ...resolveNames(data.skipped.user_ids, 'user'),
        ...resolveNames(data.skipped.employee_ids, 'employee'),
      ];

      // onRecorded ne fait que verser les réalisations créées dans le state du parent — c'est
      // onClose qui ferme le modal, appelé ici tout de suite (cas courant) ou par le bouton
      // "Fermer" de l'écran récapitulatif ci-dessous (pour laisser le temps de lire les
      // doublons ignorés avant que le modal ne disparaisse).
      onRecorded(data.created);
      if (skipped.length > 0) {
        setSkippedNames(skipped);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la réalisation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (skippedNames) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
        <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Réalisation enregistrée</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {skippedNames.length} personne{skippedNames.length > 1 ? 's' : ''} déjà enregistrée
            {skippedNames.length > 1 ? 's' : ''} pour cette formation à cette date {skippedNames.length > 1 ? 'ont' : 'a'} été
            ignorée{skippedNames.length > 1 ? 's' : ''} : {skippedNames.join(', ')}.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Participants</label>
            <PersonChecklist users={users} employees={employees} selected={selected} onToggle={toggle} onSetSelected={setSelected} />
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
            {submitting
              ? 'Enregistrement...'
              : selected.size > 1
                ? `Enregistrer pour ${selected.size} personnes`
                : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AttendanceSheetModal({ training, users, employees, onClose }) {
  const [selected, setSelected] = useState(new Set());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selected.size === 0) {
      setError('Sélectionnez au moins un participant.');
      return;
    }

    setError('');
    setDownloading(true);

    const userIds = [...selected].filter((key) => key.startsWith('user:')).map((key) => key.slice(5));
    const employeeIds = [...selected].filter((key) => key.startsWith('employee:')).map((key) => key.slice(9));

    // onClose() volontairement hors du try : voir Kpis.jsx pour l'incident de référence — un bug
    // dans la fermeture du modal ne doit pas se faire passer pour un échec de génération du PDF.
    try {
      await postForPdfDownload(
        `/trainings/${training.id}/attendance-sheet/pdf`,
        { user_ids: userIds, employee_ids: employeeIds, date },
        `fiche-participation-${training.title.toLowerCase().replace(/\s+/g, '-')}-${date}.pdf`
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer la fiche de participation.');
      setDownloading(false);
      return;
    }
    setDownloading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Fiche de participation</h2>
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Participants</label>
            <PersonChecklist users={users} employees={employees} selected={selected} onToggle={toggle} onSetSelected={setSelected} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de la session</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {downloading ? 'Génération...' : 'Télécharger le PDF'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ExcludePersonModal({ users, employees, onClose, onExcluded }) {
  const [personKeyValue, setPersonKeyValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const eligiblePeople = combinePeople(users, employees).filter((p) => !p.training_exempt);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!personKeyValue) {
      setError('Sélectionnez une personne.');
      return;
    }

    setError('');
    setSubmitting(true);

    const [kind, id] = personKeyValue.split(':');

    // onExcluded() volontairement hors du try : voir Kpis.jsx pour l'incident de référence.
    let data;
    try {
      ({ data } = await api.patch(`/${kind === 'user' ? 'users' : 'employees'}/${id}`, {
        training_exempt: true,
        training_exempt_reason: reason || undefined,
      }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'exclure cette personne.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onExcluded(kind, data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Exclure du suivi formations</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Cette personne n'apparaîtra plus comme en retard ou jamais formée dans la matrice des compétences ni dans les relances.
        </p>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Personne</label>
            <select
              required
              value={personKeyValue}
              onChange={(e) => setPersonKeyValue(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Sélectionner...</option>
              {eligiblePeople.map((person) => (
                <option key={personKey(person.kind, person.id)} value={personKey(person.kind, person.id)}>
                  {person.full_name} {person.kind === 'employee' ? '(sans compte)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Motif (optionnel)</label>
            <input
              type="text"
              placeholder="Ex : poste externe, congé longue durée..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement...' : 'Exclure'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Raccourci de création de dossier directement depuis la page Formations, sans passer par
// Paramètres > Catégories — juste nom + couleur, même modale que Capas.jsx (voir NewFolderModal
// là-bas), adaptée à POST /module-categories (resource_type: 'training').
function NewFolderModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1F3864');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    let data;
    try {
      ({ data } = await api.post('/module-categories', { resource_type: 'training', name, color }));
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer ce dossier.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full rounded-t-xl bg-white p-5 sm:max-w-sm sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouveau dossier</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex : Formations sécurité, Formations métier..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Couleur</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-16 rounded-md border border-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Création...' : 'Créer le dossier'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Trainings() {
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [trainings, setTrainings] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [recordingTraining, setRecordingTraining] = useState(null);
  const [attendanceSheetTraining, setAttendanceSheetTraining] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [isExcludeModalOpen, setIsExcludeModalOpen] = useState(false);
  const [certificateDownloadingId, setCertificateDownloadingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('folder');
  const [expandedFolders, setExpandedFolders] = useState(() => new Set());
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);
  const [search, setSearch] = useState('');

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleFolder(key) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleFolderCreated(category) {
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    setIsNewFolderModalOpen(false);
    setExpandedFolders((prev) => new Set(prev).add(category.id));
  }

  // PATCH /trainings/:id renvoie la ligne brute (pas de jointure records/category, voir
  // trainings.js) — on fusionne dans l'item existant pour garder ses réalisations déjà chargées,
  // et on reconstruit `category` depuis le state local plutôt que de la laisser périmée.
  async function handleCategoryChange(event, training) {
    event.stopPropagation();
    const categoryId = event.target.value || null;
    setUpdatingCategoryId(training.id);
    try {
      const { data } = await api.patch(`/trainings/${training.id}`, { category_id: categoryId });
      const category = categories.find((c) => c.id === categoryId) || null;
      setTrainings((prev) => prev.map((item) => (item.id === training.id ? { ...item, ...data, category } : item)));
    } catch {
      setError('Impossible de changer le dossier de cette formation.');
    } finally {
      setUpdatingCategoryId(null);
    }
  }

  function handleBulkMoved() {
    setIsBulkMoveModalOpen(false);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkDelete() {
    if (
      !window.confirm(`Supprimer définitivement ${selectedIds.length} formation(s) sélectionnée(s) ? Cette action est irréversible.`)
    ) {
      return;
    }
    try {
      await api.delete('/trainings/bulk', { data: { ids: selectedIds } });
      setTrainings((prev) => prev.filter((training) => !selectedIds.includes(training.id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de supprimer ces formations.');
    }
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [trainingsRes, usersRes, employeesRes, categoriesRes] = await Promise.all([
        api.get('/trainings'),
        api.get('/users'),
        api.get('/employees'),
        api.get('/module-categories', { params: { resource_type: 'training' } }),
      ]);
      setTrainings(trainingsRes.data);
      setUsers(usersRes.data);
      // GET /employees renvoie aussi les inactifs (utile à la page de gestion du personnel) —
      // ce sélecteur d'enregistrement de réalisation ne doit proposer que les actifs.
      setEmployees(employeesRes.data.filter((employee) => employee.is_active));
      setCategories(categoriesRes.data);
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

  // Ne ferme plus le modal lui-même (voir RecordModal) : après un enregistrement partiel, il
  // reste ouvert le temps d'afficher qui a été ignoré comme doublon, puis se ferme via son
  // propre bouton "Fermer" (onClose={() => setRecordingTraining(null)}, déjà câblé plus bas).
  function handleRecordCreated(records) {
    setTrainings((prev) =>
      prev.map((training) =>
        training.id === recordingTraining.id ? { ...training, records: [...training.records, ...records] } : training
      )
    );
  }

  function handleExcluded(kind, updatedPerson) {
    if (kind === 'user') {
      setUsers((prev) => prev.map((u) => (u.id === updatedPerson.id ? updatedPerson : u)));
    } else {
      setEmployees((prev) => prev.map((e) => (e.id === updatedPerson.id ? updatedPerson : e)));
    }
    setIsExcludeModalOpen(false);
  }

  async function handleReinstate(person) {
    try {
      const { data } = await api.patch(`/${person.kind === 'user' ? 'users' : 'employees'}/${person.id}`, {
        training_exempt: false,
        training_exempt_reason: null,
      });
      if (person.kind === 'user') {
        setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
      } else {
        setEmployees((prev) => prev.map((e) => (e.id === data.id ? data : e)));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de réintégrer cette personne.');
    }
  }

  async function handleDownloadCertificate(training, record) {
    setCertificateDownloadingId(record.id);
    try {
      await getPdfDownload(
        `/trainings/${training.id}/records/${record.id}/certificate/pdf`,
        `certificat-${training.title.toLowerCase().replace(/\s+/g, '-')}-${personName(record).toLowerCase().replace(/\s+/g, '-')}.pdf`
      );
    } catch {
      setError('Impossible de générer le certificat.');
    } finally {
      setCertificateDownloadingId(null);
    }
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

  function handleExportCsv(scopeIds) {
    const source = scopeIds ? trainings.filter((training) => scopeIds.includes(training.id)) : trainings;
    const headers = ['Formation', 'Type', 'Personne', 'Statut personnel', 'Date de réalisation'];
    const rows = source.flatMap((training) =>
      training.records.map((record) => [
        training.title,
        training.type || '',
        personName(record),
        record.employee_id ? 'Sans compte' : 'Compte',
        formatDate(record.completed_at),
      ])
    );
    exportToCsv(`formations-${new Date().toISOString().slice(0, 10)}.csv`, 'Formations', headers, rows, {
      generatedBy: currentUser?.full_name,
      subtitle: `${rows.length} réalisation${rows.length > 1 ? 's' : ''}`,
    });
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? trainings.filter((training) => scopeIds.includes(training.id)) : trainings;
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
      const rows = source.flatMap((training) =>
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
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportXlsx(scopeIds) {
    const source = scopeIds ? trainings.filter((training) => scopeIds.includes(training.id)) : trainings;
    setExportingXlsx(true);
    setExportPdfError('');
    try {
      const columns = [
        { key: 'training', label: 'Formation' },
        { key: 'type', label: 'Type' },
        { key: 'person', label: 'Personne' },
        { key: 'status', label: 'Statut' },
        { key: 'completed_at', label: 'Réalisation' },
      ];
      const rows = source.flatMap((training) =>
        training.records.map((record) => ({
          training: training.title,
          type: training.type || '',
          person: personName(record),
          status: record.employee_id ? 'Sans compte' : 'Compte',
          completed_at: formatDate(record.completed_at),
        }))
      );
      await exportToXlsx(`formations-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Formations', columns, rows, {
        subtitle: `${rows.length} réalisation${rows.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? trainings.filter((training) => scopeIds.includes(training.id)) : trainings;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const columns = [
        { key: 'training', label: 'Formation' },
        { key: 'type', label: 'Type' },
        { key: 'person', label: 'Personne' },
        { key: 'status', label: 'Statut' },
        { key: 'completed_at', label: 'Réalisation' },
      ];
      const rows = source.flatMap((training) =>
        training.records.map((record) => ({
          training: training.title,
          type: training.type || '',
          person: personName(record),
          status: record.employee_id ? 'Sans compte' : 'Compte',
          completed_at: formatDate(record.completed_at),
        }))
      );
      await exportToDrive('FORM', 'Formations', columns, rows, {
        subtitle: `${rows.length} réalisation${rows.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
      setDriveSuccess('Enregistré sur le Drive partagé.');
    } catch (err) {
      setExportPdfError(err.response?.data?.error || "Impossible d'enregistrer sur le Drive.");
    } finally {
      setExportingDrive(false);
    }
  }

  const hasAnyRecord = trainings.some((training) => training.records.length > 0);

  const today = new Date().toISOString().slice(0, 10);
  const dormantCount = trainings.filter((training) => training.records.length === 0).length;
  const overdueRecordsCount = trainings.reduce((sum, training) => sum + countOverdueRecords(training, today), 0);

  const filteredTrainings = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trainings;
    return trainings.filter(
      (training) => training.title.toLowerCase().includes(query) || training.type?.toLowerCase().includes(query)
    );
  }, [trainings, search]);

  const { sorted: sortedTrainings, sortKey, direction, setSortKey, toggleSort } = useSort(
    filteredTrainings,
    getTrainingSortValue,
    'title',
    'asc'
  );

  // Un dossier par catégorie (module_categories, resource_type='training'), plus un dossier "Sans
  // dossier" en dernier pour les formations non classées — jamais affiché s'il est vide. Reprend
  // sortedTrainings (déjà trié) pour que le mode dossier reste cohérent avec le mode liste, même
  // principe que Capas.jsx.
  const groupedByFolder = useMemo(() => {
    const byCategory = new Map(categories.map((category) => [category.id, []]));
    const unfiled = [];
    for (const training of sortedTrainings) {
      if (training.category_id && byCategory.has(training.category_id)) byCategory.get(training.category_id).push(training);
      else unfiled.push(training);
    }
    const groups = categories
      .map((category) => ({ key: category.id, category, trainings: byCategory.get(category.id) || [] }))
      .filter((group) => group.trainings.length > 0);
    if (unfiled.length > 0) groups.push({ key: 'unfiled', category: null, trainings: unfiled });
    return groups;
  }, [sortedTrainings, categories]);

  const isFolderView = viewMode === 'folder';
  const trainingGroups = isFolderView ? groupedByFolder : [{ key: 'all', category: null, trainings: sortedTrainings }];

  const excludedPeople = combinePeople(users, employees).filter((p) => p.training_exempt);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Formations</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => handleExportCsv()}
            disabled={!hasAnyRecord}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportPdf()}
            disabled={exportingPdf || !hasAnyRecord}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter PDF
          </button>
          <button
            type="button"
            onClick={() => handleExportXlsx()}
            disabled={exportingXlsx || !hasAnyRecord}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingXlsx ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Exporter Excel
          </button>
          {tenant?.storage_provider === 'google_drive' && (
            <button
              type="button"
              onClick={() => handleExportDrive()}
              disabled={exportingDrive || !hasAnyRecord}
              className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingDrive ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
              Enregistrer sur Drive
            </button>
          )}
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

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Formations" value={trainings.length} accent="text-slate-900" />
        <StatCard label="Réalisations" value={trainings.reduce((sum, t) => sum + t.records.length, 0)} accent="text-slate-900" />
        <StatCard
          label="Jamais réalisées"
          value={dormantCount}
          accent={dormantCount > 0 ? 'text-amber-700' : 'text-slate-900'}
        />
        <StatCard
          label="Personnes en retard de recyclage"
          value={overdueRecordsCount}
          accent={overdueRecordsCount > 0 ? 'text-red-700' : 'text-slate-900'}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Rechercher par titre ou type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:max-w-sm"
        />
        <SortSelect
          options={TRAINING_SORT_OPTIONS}
          sortKey={sortKey}
          direction={direction}
          onChangeKey={setSortKey}
          onToggleDirection={() => toggleSort(sortKey)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('folder')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'folder' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Folder size={16} />
            Par dossier
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List size={16} />
            Liste
          </button>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderPlus size={16} />
            Nouveau dossier
          </button>
        )}
      </div>

      {canManage && (
        <SelectAllToggle
          ids={sortedTrainings.map((training) => training.id)}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportCsv={() => handleExportCsv(selectedIds)}
          onExportPdf={() => handleExportPdf(selectedIds)}
          exportingPdf={exportingPdf}
          onExportXlsx={() => handleExportXlsx(selectedIds)}
          exportingXlsx={exportingXlsx}
          onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive(selectedIds) : undefined}
          exportingDrive={exportingDrive}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds([])}
        />
      )}

      {canManage && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserX size={18} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Personnel exclu des formations</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsExcludeModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} />
              Exclure
            </button>
          </div>

          {excludedPeople.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Personne n'est exclue du suivi formations.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {excludedPeople.map((person) => (
                <li key={personKey(person.kind, person.id)} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">{person.full_name}</span>
                    <span className="ml-1.5 text-xs text-slate-400">({PERSON_KIND_LABEL[person.kind]})</span>
                    {person.training_exempt_reason && (
                      <p className="truncate text-xs text-slate-400">{person.training_exempt_reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReinstate(person)}
                    className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Réintégrer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {exportPdfError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{exportPdfError}</p>
      )}
      {driveSuccess && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{driveSuccess}</p>
      )}

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : trainings.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune formation pour l'instant.</p>
      ) : sortedTrainings.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Aucune formation ne correspond à cette recherche.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainingGroups.map((group) => (
            <Fragment key={group.key}>
              {isFolderView && (
                <button
                  type="button"
                  onClick={() => toggleFolder(group.key)}
                  className="col-span-full flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700"
                >
                  {expandedFolders.has(group.key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <Folder size={14} style={group.category?.color ? { color: group.category.color } : undefined} />
                  {group.category ? group.category.name : 'Sans dossier'}
                  <span className="font-normal text-slate-400">({group.trainings.length})</span>
                </button>
              )}
              {(!isFolderView || expandedFolders.has(group.key)) &&
                group.trainings.map((training) => {
                  const isExpanded = expandedId === training.id;
                  const overdueCount = countOverdueRecords(training, today);

                  return (
                    <div
                      key={training.id}
                      className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${
                        overdueCount > 0 ? 'border-red-300' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {canManage && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(training.id)}
                              onChange={() => toggleSelect(training.id)}
                              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                          )}
                          <p className="font-medium text-slate-900">{training.title}</p>
                        </div>
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
                      {(training.duration || training.instructor || training.location) && (
                        <p className="mt-1 text-xs text-slate-400">
                          {[training.duration, training.instructor, training.location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {training.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{training.description}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {overdueCount > 0 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            {overdueCount} en retard de recyclage
                          </span>
                        )}
                        {overdueCount === 0 && training.records.length === 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Aucune réalisation
                          </span>
                        )}
                        <CategoryBadge category={training.category} />
                        {canManage && (
                          <select
                            value={training.category_id || ''}
                            disabled={updatingCategoryId === training.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCategoryChange(e, training)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Sans dossier</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

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
                        <ul className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                          {training.records.map((record) => (
                            <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
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
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadCertificate(training, record)}
                                  disabled={certificateDownloadingId === record.id}
                                  className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {certificateDownloadingId === record.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Award size={13} />
                                  )}
                                  Certificat
                                </button>
                                {canManage && (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setRecordingTraining(training)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <UserCheck size={16} />
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceSheetTraining(training)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <FileSignature size={16} />
                          Fiche de participation
                        </button>
                      </div>
                    </div>
                  );
                })}
            </Fragment>
          ))}
        </div>
      )}

      {isNewModalOpen && (
        <NewTrainingModal categories={categories} onClose={() => setIsNewModalOpen(false)} onCreated={handleTrainingCreated} />
      )}

      {recordingTraining && (
        <RecordModal
          training={recordingTraining}
          users={users}
          employees={employees}
          onClose={() => setRecordingTraining(null)}
          onRecorded={handleRecordCreated}
        />
      )}

      {attendanceSheetTraining && (
        <AttendanceSheetModal
          training={attendanceSheetTraining}
          users={users}
          employees={employees}
          onClose={() => setAttendanceSheetTraining(null)}
        />
      )}

      {isExcludeModalOpen && (
        <ExcludePersonModal
          users={users}
          employees={employees}
          onClose={() => setIsExcludeModalOpen(false)}
          onExcluded={handleExcluded}
        />
      )}

      {editingTraining && (
        <EditTrainingModal
          training={editingTraining}
          categories={categories}
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

      {isBulkMoveModalOpen && (
        <BulkMoveCategoryModal
          resourceType="training"
          endpoint="/trainings/bulk-category"
          categories={categories}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isNewFolderModalOpen && (
        <NewFolderModal onClose={() => setIsNewFolderModalOpen(false)} onCreated={handleFolderCreated} />
      )}
    </div>
  );
}
