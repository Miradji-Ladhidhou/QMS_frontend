import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  FileSignature,
  FolderCog,
  FolderInput,
  FolderPlus,
  Grid3x3,
  History,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useUsers } from '../lib/useUsers.js';
import {
  exportToPdf,
  exportToXlsx,
  exportToWord,
  exportToDrive,
  postForPdfDownload,
  getPdfDownload,
  getWordDownload,
} from '../lib/pdfExport.js';
import { CAPA_EFFECTIVENESS_LABELS, CAPA_EFFECTIVENESS_STYLES } from '../lib/capaStatus.js';
import { isManagerRole } from '../lib/roles.js';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { useTenant } from '../lib/useTenant.js';
import { useSort } from '../lib/useSort.js';
import { useFolderNavigation } from '../lib/useFolderNavigation.js';
import { resolvePersonalCategoryId } from '../lib/personalCategory.js';
import SortSelect from '../components/SortSelect.jsx';
import AutoTextarea from '../components/AutoTextarea.jsx';
import BulkSelectionBar from '../components/BulkSelectionBar.jsx';
import SelectAllToggle from '../components/SelectAllToggle.jsx';
import BulkMoveCategoryModal from '../components/BulkMoveCategoryModal.jsx';
import ManageCategoriesModal from '../components/ManageCategoriesModal.jsx';
import CategoryVisibilityField from '../components/CategoryVisibilityField.jsx';
import FolderTile from '../components/FolderTile.jsx';
import FolderBreadcrumb from '../components/FolderBreadcrumb.jsx';
import FolderPickerModal from '../components/FolderPickerModal.jsx';
import NewFolderModal from '../components/NewFolderModal.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import PageGuide from '../components/PageGuide.jsx';
import Pagination from '../components/Pagination.jsx';
import QuizEditorModal from '../components/trainingQuiz/QuizEditorModal.jsx';
import SendQuizModal from '../components/trainingQuiz/SendQuizModal.jsx';
import InstructorSignatureField from '../components/trainingQuiz/InstructorSignatureField.jsx';
import QuizHistoryModal from '../components/trainingQuiz/QuizHistoryModal.jsx';
import QuizDownloadButtons from '../components/trainingQuiz/QuizDownloadButtons.jsx';import { describeAttemptsSummary, summarizeAttempts } from '../lib/quizAttempts.js';
import { summarizeTrainingQualification } from '../lib/auditorQualification.js';

const CATEGORIES_BASE_URL = '/module-categories';
const TRAINING_RESOURCE_TYPE = 'training';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Postes déjà utilisés par au moins une personne du tenant (users/employees, déjà chargés pour
// RecordModal) — sert de suggestions de cases à cocher pour "Postes concernés" sans avoir
// besoin d'un référentiel de postes dédié ni d'un nouvel appel réseau.
function distinctJobTitles(users, employees) {
  const seen = new Set();
  const result = [];
  for (const person of [...users, ...employees]) {
    const title = person.job_title?.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(title);
    }
  }
  return result.sort((a, b) => a.localeCompare(b, 'fr'));
}

// Représente le tri-état evaluation_result (null/true/false) comme une chaîne pour un
// <select> — même conversion que CapaDetail.jsx#effectivenessToSelectValue.
function effectivenessToSelectValue(value) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

function selectValueToEffectiveness(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

// Regroupe les réalisations d'une formation par session (voir routes/trainings.js — chaque
// réalisation créée depuis cette évolution appartient toujours à une session ; les
// réalisations créées avant restent à null, groupe "sans session" toujours affiché en dernier,
// jamais masqué, puisque c'est justement ce qu'il reste à organiser). Trié par date
// décroissante, comme l'était déjà la liste plate.
function groupRecordsBySession(records) {
  const bySessionId = new Map();
  const orphans = [];
  for (const record of records) {
    if (!record.session) {
      orphans.push(record);
      continue;
    }
    const key = record.session.id;
    if (!bySessionId.has(key)) {
      bySessionId.set(key, { sessionId: key, sessionDate: record.session.session_date, records: [] });
    }
    bySessionId.get(key).records.push(record);
  }
  const sessions = [...bySessionId.values()].sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1));
  if (orphans.length > 0) {
    sessions.push({ sessionId: null, sessionDate: null, records: orphans });
  }
  return sessions;
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

// Cases à cocher construites à partir des postes déjà utilisés (distinctJobTitles), plus un
// champ libre pour un poste pas encore associé à personne. Aucune case cochée = la formation
// s'applique à tout le monde (comportement historique, préservé par défaut).
function JobTitleRequirementsField({ availableJobTitles, selected, onChange }) {
  const [newTitle, setNewTitle] = useState('');

  function isSelected(title) {
    return selected.some((t) => t.toLowerCase() === title.toLowerCase());
  }

  function toggle(title) {
    onChange(isSelected(title) ? selected.filter((t) => t.toLowerCase() !== title.toLowerCase()) : [...selected, title]);
  }

  function addCustom() {
    const trimmed = newTitle.trim();
    if (!trimmed || isSelected(trimmed)) return;
    onChange([...selected, trimmed]);
    setNewTitle('');
  }

  const customTitles = selected.filter((t) => !availableJobTitles.some((a) => a.toLowerCase() === t.toLowerCase()));

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Postes concernés</label>
      <p className="mb-2 text-xs text-slate-500">Aucun poste coché : la formation s'applique à tout le monde.</p>

      {(availableJobTitles.length > 0 || customTitles.length > 0) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {availableJobTitles.map((title) => (
            <label
              key={title}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={isSelected(title)}
                onChange={() => toggle(title)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {title}
            </label>
          ))}
          {customTitles.map((title) => (
            <span
              key={title}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary-700"
            >
              {title}
              <button type="button" onClick={() => toggle(title)} aria-label={`Retirer ${title}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Ajouter un autre intitulé de poste"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <button
          type="button"
          onClick={addCustom}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

function NewTrainingModal({ users, employees, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    type: '',
    frequency_months: '',
    location: '',
    instructor: '',
    duration: '',
    description: '',
    summary: '',
    qualifies_internal_auditor: false,
    category_id: '',
    category_name: '',
  });
  const [requiredJobTitles, setRequiredJobTitles] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableJobTitles = useMemo(() => distinctJobTitles(users, employees), [users, employees]);

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
      summary: form.summary || undefined,
      qualifies_internal_auditor: form.qualifies_internal_auditor,
      category_id: categoryId,
      required_job_titles: requiredJobTitles,
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Résumé de la formation</label>
            <AutoTextarea
              rows={4}
              placeholder="Points clés à retenir. Ce texte est lu par chaque personne avant de répondre au QCM (lien envoyé par email)."
              value={form.summary}
              onChange={(e) => updateField('summary', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="mt-1 text-xs text-slate-400">Facultatif — affiché avant le QCM, jamais dans l'export des réalisations.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={form.qualifies_internal_auditor}
              onChange={(e) => updateField('qualifies_internal_auditor', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="min-w-0 text-sm">
              <span className="block font-medium text-slate-800">Formation qualifiante pour les auditeurs internes</span>
              <span className="block text-xs text-slate-500">
                La page Audits signale si l'auditeur désigné est qualifié (formation suivie, recyclage à jour, QCM réussi). Une seule formation
                valide suffit.
              </span>
            </span>
          </label>

          <JobTitleRequirementsField
            availableJobTitles={availableJobTitles}
            selected={requiredJobTitles}
            onChange={setRequiredJobTitles}
          />

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={TRAINING_RESOURCE_TYPE}
            categoryName={form.category_name}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            onCategoryNameChange={(value) => updateField('category_name', value)}
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

function EditTrainingModal({ training, users, employees, onClose, onUpdated, onSignatureChanged }) {
  const [form, setForm] = useState({
    title: training.title,
    type: training.type || '',
    frequency_months: training.frequency_months || '',
    location: training.location || '',
    instructor: training.instructor || '',
    duration: training.duration || '',
    description: training.description || '',
    summary: training.summary || '',
    qualifies_internal_auditor: Boolean(training.qualifies_internal_auditor),
    category_id: training.category_id || '',
    category_name: training.category?.name || '',
  });
  const [requiredJobTitles, setRequiredJobTitles] = useState(training.required_job_titles || []);
  const [isPrivate, setIsPrivate] = useState(Boolean(training.is_private_to_me));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableJobTitles = useMemo(() => distinctJobTitles(users, employees), [users, employees]);

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
        summary: form.summary || null,
        qualifies_internal_auditor: form.qualifies_internal_auditor,
        category_id: categoryId,
        required_job_titles: requiredJobTitles,
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <InstructorSignatureField training={training} onChanged={onSignatureChanged} />

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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Résumé de la formation</label>
            <AutoTextarea
              rows={4}
              placeholder="Points clés à retenir. Ce texte est lu par chaque personne avant de répondre au QCM (lien envoyé par email)."
              value={form.summary}
              onChange={(e) => updateField('summary', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="mt-1 text-xs text-slate-400">Facultatif — affiché avant le QCM, jamais dans l'export des réalisations.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={form.qualifies_internal_auditor}
              onChange={(e) => updateField('qualifies_internal_auditor', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="min-w-0 text-sm">
              <span className="block font-medium text-slate-800">Formation qualifiante pour les auditeurs internes</span>
              <span className="block text-xs text-slate-500">
                La page Audits signale si l'auditeur désigné est qualifié (formation suivie, recyclage à jour, QCM réussi). Une seule formation
                valide suffit.
              </span>
            </span>
          </label>

          <JobTitleRequirementsField
            availableJobTitles={availableJobTitles}
            selected={requiredJobTitles}
            onChange={setRequiredJobTitles}
          />

          <CategoryVisibilityField
            baseUrl={CATEGORIES_BASE_URL}
            resourceType={TRAINING_RESOURCE_TYPE}
            categoryName={form.category_name}
            categoryId={form.category_id}
            onCategoryIdChange={(value) => updateField('category_id', value)}
            onCategoryNameChange={(value) => updateField('category_name', value)}
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

// Statut du dernier lien de QCM envoyé pour une réalisation : réussi/non réussi avec la note, en
// attente (avec l'échéance), ou expiré sans avoir été passé.
function QuizAttemptBadge({ attempt, attempts = [] }) {
  if (!attempt) return null;
  let label;
  let className;
  if (attempt.completed_at) {
    label = `QCM ${attempt.score_percent} % — ${attempt.passed ? 'réussi' : 'non réussi'}`;
    className = attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
  } else if (new Date(attempt.expires_at) > new Date()) {
    label = `QCM envoyé — expire le ${new Date(attempt.expires_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    className = 'bg-sky-100 text-sky-700';
  } else {
    label = 'QCM : lien expiré';
    className = 'bg-amber-100 text-amber-700';
  }
  // Nombre d'essais réellement passés (échecs + réussites) pour cette session.
  const summary = summarizeAttempts(attempts);
  return (
    <>
      <span className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[11px] font-medium ${className}`}>{label}</span>
      {summary.total > 0 && (
        <span className="ml-1.5 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
          {describeAttemptsSummary(summary)}
        </span>
      )}
    </>
  );
}

// Bandeau d'une formation qui qualifie les auditeurs internes : bilan des personnes formées et lien
// vers la page Audits (là où la qualification est utilisée pour choisir un auditeur).
function AuditorTrainingBadge({ training }) {
  const { qualified, expired, failed } = summarizeTrainingQualification(training);
  const parts = [];
  if (qualified) parts.push(`${qualified} qualifié${qualified > 1 ? 's' : ''}`);
  if (expired) parts.push(`${expired} à recycler`);
  if (failed) parts.push(`${failed} non qualifié${failed > 1 ? 's' : ''}`);
  return (
    <div className="mt-2 rounded-md border border-primary/20 bg-primary-50 px-2.5 py-2 text-xs text-slate-700">
      <p className="flex items-center gap-1.5 font-medium text-primary">
        <BadgeCheck size={13} />
        Qualifie les auditeurs internes
      </p>
      <p className="mt-0.5">{parts.length > 0 ? `Auditeurs : ${parts.join(' · ')}.` : "Aucun auditeur formé pour l'instant."}</p>
      <Link to="/audits" className="mt-0.5 inline-block font-medium text-primary hover:underline">
        Voir les audits →
      </Link>
    </div>
  );
}

function personName(record) {
  return record.user?.full_name || record.employee?.full_name || 'Personne inconnue';
}

// Sentinelle pour distinguer "garder la session actuelle" (valeur = son id, ou '' si aucune)
// de "créer une nouvelle session" dans le <select> ci-dessous — jamais confondue avec un vrai
// id de session (uuid).
const NEW_SESSION_VALUE = '__new__';

function EditRecordModal({ training, record, onClose, onUpdated }) {
  const [completedAt, setCompletedAt] = useState(record.completed_at);
  const [evaluationResult, setEvaluationResult] = useState(effectivenessToSelectValue(record.evaluation_result));
  const [evaluationNotes, setEvaluationNotes] = useState(record.evaluation_notes || '');
  const [sessionChoice, setSessionChoice] = useState(record.session?.id || '');
  const [newSessionDate, setNewSessionDate] = useState(record.completed_at);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sessions existantes de CETTE formation, dérivées des réalisations déjà chargées (voir
  // GET /trainings — pas besoin d'un appel réseau dédié) — dédupliquées et triées par date.
  const availableSessions = useMemo(() => {
    const bySessionId = new Map();
    for (const r of training.records || []) {
      if (r.session) bySessionId.set(r.session.id, r.session);
    }
    return [...bySessionId.values()].sort((a, b) => (a.session_date < b.session_date ? 1 : -1));
  }, [training.records]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    // Même règle que côté serveur (routes/trainings.js) : un verdict d'évaluation sans
    // commentaire ne tient pas en audit — vérifié ici aussi pour éviter l'aller-retour réseau.
    if (evaluationResult !== '' && !evaluationNotes.trim()) {
      setError("Merci de justifier le résultat de l'évaluation par un commentaire.");
      return;
    }

    setSubmitting(true);

    const payload = {
      completed_at: completedAt,
      evaluation_result: selectValueToEffectiveness(evaluationResult),
      evaluation_notes: evaluationNotes || null,
    };
    if (sessionChoice === NEW_SESSION_VALUE) {
      payload.new_session_date = newSessionDate;
    } else if (sessionChoice !== (record.session?.id || '')) {
      // '' (Sans session) ou l'id d'une session existante différente de l'actuelle.
      payload.session_id = sessionChoice || null;
    }

    // onUpdated() volontairement hors du try : voir Kpis.jsx pour l'incident de référence.
    let data;
    try {
      ({ data } = await api.patch(`/trainings/${training.id}/records/${record.id}`, payload));
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
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Session</label>
            <select
              value={sessionChoice}
              onChange={(e) => setSessionChoice(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Sans session</option>
              {availableSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  Session du {formatDate(session.session_date)}
                </option>
              ))}
              <option value={NEW_SESSION_VALUE}>+ Nouvelle session</option>
            </select>
            {sessionChoice === NEW_SESSION_VALUE && (
              <input
                type="date"
                required
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Évaluation d'efficacité</label>
            <select
              value={evaluationResult}
              onChange={(e) => setEvaluationResult(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">{CAPA_EFFECTIVENESS_LABELS[null]}</option>
              <option value="true">{CAPA_EFFECTIVENESS_LABELS[true]}</option>
              <option value="false">{CAPA_EFFECTIVENESS_LABELS[false]}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes d'évaluation{evaluationResult !== '' && ' *'}
            </label>
            <AutoTextarea
              rows={2}
              value={evaluationNotes}
              onChange={(e) => setEvaluationNotes(e.target.value)}
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
export default function Trainings() {
  const currentUser = useCurrentUser();
  const tenant = useTenant();
  const canManage = isManagerRole(currentUser?.role);
  const [trainings, setTrainings] = useState([]);
  const [trainingPage, setTrainingPage] = useState(1);
  // Cette page MODIFIE aussi les utilisateurs (training_exempt, voir handleExcluded/
  // handleReinstate plus bas) — contrairement aux autres pages qui lisent juste useUsers()
  // pour un menu déroulant. userOverrides applique la mutation localement pour un retour
  // visuel immédiat, en plus de l'événement 'users-updated' qui invalide le cache partagé pour
  // les autres pages déjà ouvertes.
  const sharedUsers = useUsers();
  const [userOverrides, setUserOverrides] = useState({});
  const users = sharedUsers.map((user) => (userOverrides[user.id] ? { ...user, ...userOverrides[user.id] } : user));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [recordingTraining, setRecordingTraining] = useState(null);
  const [attendanceSheetTraining, setAttendanceSheetTraining] = useState(null);
  const [editingTraining, setEditingTraining] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  // QCM : éditeur ouvert sur une formation, envoi de liens pour un groupe (session) de réalisations,
  // passages déjà envoyés/terminés par formation (chargés à l'ouverture de la carte, admin/manager).
  const [quizEditorTraining, setQuizEditorTraining] = useState(null);
  const [sendQuizTarget, setSendQuizTarget] = useState(null);
  const [attemptsByTraining, setAttemptsByTraining] = useState({});
  const [quizDownloading, setQuizDownloading] = useState(null); // { id, format } de l'export de QCM en cours
  const [quizHistoryTarget, setQuizHistoryTarget] = useState(null); // { training, record, sessionLabel }
  // Lien profond ?training=<id> (depuis la page Audits) : ouvre le dossier de la formation, déplie sa carte et la met en évidence.
  const [searchParams, setSearchParams] = useSearchParams();
  const focusTrainingId = searchParams.get('training');
  const [highlightId, setHighlightId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');
  const [exportPdfError, setExportPdfError] = useState('');
  const [isExcludeModalOpen, setIsExcludeModalOpen] = useState(false);
  const [certificateDownloadingId, setCertificateDownloadingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [movingTraining, setMovingTraining] = useState(null);
  const [search, setSearch] = useState('');
  const {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders,
  } = useFolderNavigation({ baseUrl: CATEGORIES_BASE_URL, resourceType: TRAINING_RESOURCE_TYPE });

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // PATCH /trainings/:id renvoie la ligne brute (pas de jointure records/category, voir
  // trainings.js) — on fusionne dans l'item existant pour garder ses réalisations déjà chargées
  // (la carte n'affiche plus de badge de dossier, seulement le bouton "Déplacer").
  async function handleMoveTraining(folderId) {
    const training = movingTraining;
    setMovingTraining(null);
    try {
      const { data } = await api.patch(`/trainings/${training.id}`, { category_id: folderId || null });
      setTrainings((prev) => prev.map((item) => (item.id === training.id ? { ...item, ...data } : item)));
    } catch {
      setError('Impossible de changer le dossier de cette formation.');
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
      const [trainingsRes, employeesRes] = await Promise.all([
        api.get('/trainings'),
        api.get('/employees'),
      ]);
      setTrainings(trainingsRes.data);
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

  useEffect(() => {
    if (!focusTrainingId || loading) return undefined;
    const target = trainings.find((item) => item.id === focusTrainingId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('training');
        if (target) {
          if (target.category_id) next.set('folder', target.category_id);
          else next.delete('folder');
        }
        return next;
      },
      { replace: true }
    );
    if (!target) return undefined;
    setExpandedId(target.id);
    setHighlightId(target.id);
    if (canManage && target.quiz) loadQuizAttempts(target.id);
    // La carte n'existe dans la page qu'une fois le dossier ouvert et sa liste affichée : on réessaie
    // quelques instants avant d'abandonner le défilement.
    let attempts = 0;
    const scrollTimer = setInterval(() => {
      attempts += 1;
      const card = document.getElementById(`training-${target.id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearInterval(scrollTimer);
      } else if (attempts >= 20) {
        clearInterval(scrollTimer);
      }
    }, 200);
    setTimeout(() => setHighlightId(null), 4500);
    // Pas de nettoyage des minuteurs ici : retirer ?training= de l'adresse (ci-dessus) relance cet
    // effet, et son nettoyage annulerait aussitôt le défilement avant qu'il n'ait eu lieu.
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTrainingId, loading]);

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
      setUserOverrides((prev) => ({ ...prev, [updatedPerson.id]: updatedPerson }));
      window.dispatchEvent(new Event('users-updated'));
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
        setUserOverrides((prev) => ({ ...prev, [data.id]: data }));
        window.dispatchEvent(new Event('users-updated'));
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

  async function loadQuizAttempts(trainingId) {
    try {
      const { data } = await api.get(`/trainings/${trainingId}/quiz/attempts`);
      setAttemptsByTraining((prev) => ({ ...prev, [trainingId]: data }));
    } catch {
      // Les badges de QCM sont un complément : un échec ne doit pas bloquer la carte.
    }
  }

  // Relit les réalisations de cette formation : une personne peut avoir passé son QCM depuis
  // l'ouverture de la page (la réalisation passe alors à réussie/non réussie côté serveur).
  async function refreshTrainingRecords(trainingId) {
    try {
      const { data } = await api.get('/trainings');
      const fresh = data.find((item) => item.id === trainingId);
      if (fresh) setTrainings((prev) => prev.map((item) => (item.id === trainingId ? { ...item, records: fresh.records } : item)));
    } catch {
      // Simple rafraîchissement : les données déjà affichées restent valables.
    }
  }

  function handleToggleExpand(training) {
    const opening = expandedId !== training.id;
    setExpandedId(opening ? training.id : null);
    // À chaque ouverture (pas seulement la première) : les résultats arrivent sans action de
    // l'administrateur, il ne doit pas lire un état périmé.
    if (opening && canManage && training.quiz) {
      loadQuizAttempts(training.id);
      refreshTrainingRecords(training.id);
    }
  }

  async function handleDownloadQuiz(training, attempt, record, format) {
    setQuizDownloading({ id: attempt.id, format });
    const baseName = `qcm-${training.title.toLowerCase().replace(/\s+/g, '-')}-${personName(record).toLowerCase().replace(/\s+/g, '-')}`;
    try {
      if (format === 'pdf') {
        await getPdfDownload(`/trainings/${training.id}/quiz/attempts/${attempt.id}/pdf`, `${baseName}.pdf`);
      } else {
        await getWordDownload(`/trainings/${training.id}/quiz/attempts/${attempt.id}/word`, `${baseName}.docx`);
      }
    } catch {
      setError(`Impossible de générer l'export ${format === 'pdf' ? 'PDF' : 'Word'} du QCM.`);
    } finally {
      setQuizDownloading(null);
    }
  }

  function handleQuizSaved(training, quizInfo) {
    setTrainings((prev) => prev.map((item) => (item.id === training.id ? { ...item, quiz: quizInfo } : item)));
    setQuizEditorTraining(null);
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

  function buildExportColumns({ forPdf } = {}) {
    return [
      { key: 'training', label: 'Formation', width: forPdf ? 0.14 : undefined },
      { key: 'type', label: 'Type', width: forPdf ? 0.08 : undefined },
      { key: 'description', label: 'Description', width: forPdf ? 0.14 : undefined },
      { key: 'frequency_months', label: 'Fréquence (mois)', width: forPdf ? 0.08 : undefined },
      { key: 'location', label: 'Lieu', width: forPdf ? 0.08 : undefined },
      { key: 'instructor', label: 'Formateur', width: forPdf ? 0.1 : undefined },
      { key: 'duration', label: 'Durée', width: forPdf ? 0.06 : undefined },
      { key: 'person', label: 'Personne', width: forPdf ? 0.12 : undefined },
      { key: 'status', label: 'Statut', width: forPdf ? 0.07 : undefined },
      { key: 'completed_at', label: 'Réalisation', width: forPdf ? 0.07 : undefined },
      { key: 'next_due_date', label: 'Prochaine échéance', width: forPdf ? 0.06 : undefined },
    ];
  }

  function buildExportRows(source) {
    return source.flatMap((training) =>
      training.records.map((record) => ({
        training: training.title,
        type: training.type || '',
        description: training.description || '',
        frequency_months: training.frequency_months || '',
        location: training.location || '',
        instructor: training.instructor || '',
        duration: training.duration || '',
        person: personName(record),
        status: record.employee_id ? 'Sans compte' : 'Compte',
        completed_at: formatDate(record.completed_at),
        next_due_date: formatDate(record.next_due_date),
      }))
    );
  }

  async function handleExportPdf(scopeIds) {
    const source = scopeIds ? trainings.filter((training) => scopeIds.includes(training.id)) : trainings;
    setExportingPdf(true);
    setExportPdfError('');
    try {
      const rows = buildExportRows(source);
      await exportToPdf(`formations-${new Date().toISOString().slice(0, 10)}.pdf`, 'Formations', buildExportColumns({ forPdf: true }), rows, {
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
      const rows = buildExportRows(source);
      await exportToXlsx(`formations-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Formations', buildExportColumns(), rows, {
        subtitle: `${rows.length} réalisation${rows.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError("Impossible de générer le fichier Excel.");
    } finally {
      setExportingXlsx(false);
    }
  }

  async function handleExportWord(scopeIds) {
    const source = scopeIds ? trainings.filter((training) => scopeIds.includes(training.id)) : trainings;
    setExportingWord(true);
    setExportPdfError('');
    try {
      const rows = buildExportRows(source);
      await exportToWord(`formations-${new Date().toISOString().slice(0, 10)}.docx`, 'Formations', buildExportColumns(), rows, {
        subtitle: `${rows.length} réalisation${rows.length > 1 ? 's' : ''}`,
        generatedBy: currentUser?.full_name,
      });
    } catch {
      setExportPdfError('Impossible de générer le document Word.');
    } finally {
      setExportingWord(false);
    }
  }

  async function handleExportDrive(scopeIds) {
    const source = scopeIds ? trainings.filter((training) => scopeIds.includes(training.id)) : trainings;
    setExportingDrive(true);
    setExportPdfError('');
    setDriveSuccess('');
    try {
      const rows = buildExportRows(source);
      await exportToDrive('FORM', 'Formations', buildExportColumns({ forPdf: true }), rows, {
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

  // sortedTrainings reste la liste COMPLÈTE (recherche + tri) : naviguer dans un dossier ne fait
  // que choisir, côté affichage, quel sous-ensemble montrer — filtrage client de la liste déjà
  // chargée, même principe que Risks.jsx/Suppliers.jsx. "Sans dossier" (racine) = category_id
  // null.
  const currentFolderTrainings = useMemo(
    () => sortedTrainings.filter((training) => (training.category_id || null) === currentFolderId),
    [sortedTrainings, currentFolderId]
  );
  const trainingTotalPages = Math.max(1, Math.ceil(currentFolderTrainings.length / 25));
  const pagedTrainings = currentFolderTrainings.slice((trainingPage - 1) * 25, trainingPage * 25);
  useEffect(() => setTrainingPage(1), [currentFolderId, searchText]);
  useEffect(() => { if (trainingPage > trainingTotalPages) setTrainingPage(trainingTotalPages); }, [trainingPage, trainingTotalPages]);

  const excludedPeople = combinePeople(users, employees).filter((p) => p.training_exempt);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Formations</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ExportMenu
            disabled={!hasAnyRecord}
            onExportPdf={() => handleExportPdf()}
            exportingPdf={exportingPdf}
            onExportXlsx={() => handleExportXlsx()}
            exportingXlsx={exportingXlsx}
            onExportWord={() => handleExportWord()}
            exportingWord={exportingWord}
            onExportDrive={tenant?.storage_provider === 'google_drive' ? () => handleExportDrive() : undefined}
            exportingDrive={exportingDrive}
          />
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
      <PageGuide id="trainings" />

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
        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={navigateToFolder} rootLabel="Toutes les formations" />

        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setIsManageCategoriesOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <FolderCog size={16} />
            Gérer les dossiers
          </button>
        )}
      </div>

      {canManage && (
        <SelectAllToggle
          ids={currentFolderTrainings.map((training) => training.id)}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      )}

      {canManage && (
        <BulkSelectionBar
          count={selectedIds.length}
          onMove={() => setIsBulkMoveModalOpen(true)}
          onExportPdf={() => handleExportPdf(selectedIds)}
          exportingPdf={exportingPdf}
          onExportXlsx={() => handleExportXlsx(selectedIds)}
          exportingXlsx={exportingXlsx}
          onExportWord={() => handleExportWord(selectedIds)}
          exportingWord={exportingWord}
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

      {loading || foldersLoading ? (
        <div className="mt-4 flex max-w-4xl flex-col gap-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="max-w-4xl">
          {(folders.length > 0 || currentUser?.role === 'admin') && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {folders.map((folder) => (
                <FolderTile key={folder.id} folder={folder} canManage={false} onOpen={() => navigateToFolder(folder.id)} />
              ))}
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <FolderPlus size={26} />
                  <span className="text-sm font-medium">Nouveau dossier</span>
                </button>
              )}
            </div>
          )}

          {trainings.length === 0 && folders.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">Aucune formation pour l'instant.</p>
          ) : sortedTrainings.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">Aucune formation ne correspond à cette recherche.</p>
          ) : currentFolderTrainings.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {currentFolderId ? 'Aucune formation directement dans ce dossier.' : 'Aucune formation sans dossier.'}
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {pagedTrainings.map((training) => {
                  const isExpanded = expandedId === training.id;
                  const overdueCount = countOverdueRecords(training, today);
                  const sessionGroups = groupRecordsBySession(training.records);
                  const sessionCount = sessionGroups.filter((group) => group.sessionId !== null).length;
                  // Passage de QCM le plus récent par réalisation (l'API les renvoie du plus récent au plus ancien).
                  const latestAttemptByRecord = new Map();
                  // Tous les passages de chaque réalisation (session) : nombre d'essais, échecs, réussites.
                  const attemptsByRecord = new Map();
                  for (const attempt of attemptsByTraining[training.id] || []) {
                    if (!latestAttemptByRecord.has(attempt.record_id)) latestAttemptByRecord.set(attempt.record_id, attempt);
                    attemptsByRecord.set(attempt.record_id, [...(attemptsByRecord.get(attempt.record_id) || []), attempt]);
                  }

                  return (
                    <div
                      key={training.id}
                      id={`training-${training.id}`}
                      className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm transition-shadow sm:p-5 ${
                        overdueCount > 0 ? 'border-red-300' : 'border-slate-200'
                      } ${highlightId === training.id ? 'ring-2 ring-primary' : ''}`}
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
                      {training.qualifies_internal_auditor && <AuditorTrainingBadge training={training} />}

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
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setMovingTraining(training)}
                            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <FolderInput size={12} />
                            Déplacer
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleExpand(training)}
                        disabled={training.records.length === 0}
                        className="mt-1 flex items-center gap-1 text-sm text-slate-600 hover:text-primary disabled:cursor-default disabled:hover:text-slate-600"
                      >
                        {sessionCount} session{sessionCount > 1 ? 's' : ''} · {training.records.length} réalisation
                        {training.records.length > 1 ? 's' : ''}
                        {training.records.length > 0 && (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </button>
                      {!isExpanded && training.records.length > 0 && (
                        <p className="mt-1 text-xs text-slate-400">
                          Dernière : {formatDate(training.records[training.records.length - 1]?.completed_at)}
                        </p>
                      )}

                      {isExpanded && (
                        <div className="mt-2 space-y-3 border-t border-slate-100 pt-2">
                          {sessionGroups.map((group) => (
                            <div key={group.sessionId || 'none'}>
                              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <p className={`text-xs font-medium ${group.sessionId === null ? 'text-amber-600' : 'text-slate-500'}`}>
                                  {group.sessionId === null ? 'Sans session' : `Session du ${formatDate(group.sessionDate)}`}
                                  {' — '}
                                  {group.records.length} réalisation{group.records.length > 1 ? 's' : ''}
                                </p>
                                {canManage && training.quiz && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSendQuizTarget({
                                        training,
                                        records: group.records,
                                        sessionLabel: group.sessionId === null ? 'Sans session' : `Session du ${formatDate(group.sessionDate)}`,
                                      })
                                    }
                                    className="flex items-center gap-1.5 rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-50"
                                  >
                                    <Send size={12} />
                                    Envoyer le QCM
                                  </button>
                                )}
                              </div>
                              <ul className="space-y-2">
                                {group.records.map((record) => (
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
                                      {record.evaluation_result !== null && (
                                        <span
                                          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${CAPA_EFFECTIVENESS_STYLES[record.evaluation_result]}`}
                                        >
                                          {CAPA_EFFECTIVENESS_LABELS[record.evaluation_result]}
                                        </span>
                                      )}
                                      {canManage && <QuizAttemptBadge attempt={latestAttemptByRecord.get(record.id)} attempts={attemptsByRecord.get(record.id) || []} />}
                                    </span>
                                    <div className="flex max-w-full flex-wrap items-center gap-2">
                                      {canManage && (attemptsByRecord.get(record.id) || []).length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setQuizHistoryTarget({
                                              training,
                                              record,
                                              sessionLabel: group.sessionId === null ? 'Sans session' : `Session du ${formatDate(group.sessionDate)}`,
                                            })
                                          }
                                          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                          <History size={13} />
                                          Essais ({summarizeAttempts(attemptsByRecord.get(record.id)).total})
                                        </button>
                                      )}
                                      {canManage && latestAttemptByRecord.get(record.id)?.completed_at && (
                                        <QuizDownloadButtons
                                          attempt={latestAttemptByRecord.get(record.id)}
                                          downloading={quizDownloading}
                                          onDownload={(attempt, format) => handleDownloadQuiz(training, attempt, record, format)}
                                        />
                                      )}
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
                            </div>
                          ))}
                        </div>
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
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setQuizEditorTraining(training)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <ClipboardList size={16} />
                            {training.quiz ? `QCM (${training.quiz.question_count})` : 'Créer le QCM'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
              })}
              <Pagination page={trainingPage} totalPages={trainingTotalPages} onPageChange={setTrainingPage} />
            </div>
          )}
        </div>
      )}

      {isNewModalOpen && (
        <NewTrainingModal
          users={users}
          employees={employees}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={handleTrainingCreated}
        />
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

      {quizEditorTraining && (
        <QuizEditorModal
          training={quizEditorTraining}
          onClose={() => setQuizEditorTraining(null)}
          onSaved={(quizInfo) => handleQuizSaved(quizEditorTraining, quizInfo)}
        />
      )}

      {sendQuizTarget && (
        <SendQuizModal
          training={sendQuizTarget.training}
          sessionLabel={sendQuizTarget.sessionLabel}
          records={sendQuizTarget.records}
          employees={employees}
          hasSummary={Boolean(sendQuizTarget.training.summary)}
          onClose={() => setSendQuizTarget(null)}
          onSent={() => loadQuizAttempts(sendQuizTarget.training.id)}
        />
      )}

      {quizHistoryTarget && (
        <QuizHistoryModal
          training={quizHistoryTarget.training}
          personLabel={personName(quizHistoryTarget.record)}
          sessionLabel={quizHistoryTarget.sessionLabel}
          attempts={(attemptsByTraining[quizHistoryTarget.training.id] || []).filter((attempt) => attempt.record_id === quizHistoryTarget.record.id)}
          downloading={quizDownloading}
          onDownload={(attempt, format) => handleDownloadQuiz(quizHistoryTarget.training, attempt, quizHistoryTarget.record, format)}
          onClose={() => setQuizHistoryTarget(null)}
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
          users={users}
          employees={employees}
          onClose={() => setEditingTraining(null)}
          onUpdated={handleTrainingUpdated}
          onSignatureChanged={(hasSignature) =>
            setTrainings((prev) => prev.map((item) => (item.id === editingTraining.id ? { ...item, has_instructor_signature: hasSignature } : item)))
          }
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
          resourceType={TRAINING_RESOURCE_TYPE}
          endpoint="/trainings/bulk-category"
          baseUrl={CATEGORIES_BASE_URL}
          selectedIds={selectedIds}
          onClose={() => setIsBulkMoveModalOpen(false)}
          onMoved={handleBulkMoved}
        />
      )}

      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={TRAINING_RESOURCE_TYPE}
          isAdmin
          onClose={() => setIsManageCategoriesOpen(false)}
          onChanged={reloadFolders}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={TRAINING_RESOURCE_TYPE}
          parentId={currentFolderId}
          onClose={() => setIsNewFolderOpen(false)}
          onCreated={() => {
            setIsNewFolderOpen(false);
            reloadFolders();
          }}
        />
      )}

      {movingTraining && (
        <FolderPickerModal
          baseUrl={CATEGORIES_BASE_URL}
          resourceType={TRAINING_RESOURCE_TYPE}
          initialFolderId={movingTraining.category_id || null}
          title="Déplacer"
          subtitle={movingTraining.title}
          confirmLabel="Déplacer ici"
          onClose={() => setMovingTraining(null)}
          onSelect={handleMoveTraining}
        />
      )}
    </div>
  );
}
