import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import AutoTextarea from '../AutoTextarea.jsx';

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

// Identifiant stable côté client : conservé à l'enregistrement, il permet de retrouver une
// question/réponse dans un passage déjà fait même si le QCM est remanié ensuite.
function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function emptyOption() {
  return { id: newId(), label: '', is_correct: false };
}

function emptyQuestion() {
  return { id: newId(), text: '', options: [emptyOption(), emptyOption()] };
}

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Édition du QCM d'une formation : questions, réponses proposées (une ou plusieurs correctes) et
// seuil de réussite. Un seul QCM par formation, réutilisé pour toutes ses sessions ; le modifier
// n'affecte pas les liens déjà envoyés (chaque passage garde la version reçue).
export default function QuizEditorModal({ training, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState('80');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/trainings/${training.id}/quiz`)
      .then(({ data }) => {
        if (data) {
          setThreshold(String(data.pass_threshold));
          setQuestions(data.questions.length > 0 ? data.questions : [emptyQuestion()]);
        }
      })
      .catch(() => setError('Impossible de charger le QCM.'))
      .finally(() => setLoading(false));
  }, [training.id]);

  function updateQuestion(questionId, patch) {
    setQuestions((prev) => prev.map((question) => (question.id === questionId ? { ...question, ...patch } : question)));
  }

  function updateOption(questionId, optionId, patch) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, options: question.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)) }
          : question
      )
    );
  }

  function addOption(questionId) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId && question.options.length < MAX_OPTIONS
          ? { ...question, options: [...question.options, emptyOption()] }
          : question
      )
    );
  }

  function removeOption(questionId, optionId) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId && question.options.length > MIN_OPTIONS
          ? { ...question, options: question.options.filter((option) => option.id !== optionId) }
          : question
      )
    );
  }

  function removeQuestion(questionId) {
    setQuestions((prev) => prev.filter((question) => question.id !== questionId));
  }

  // Contrôles avant envoi, avec un message qui dit QUELLE question pose problème — le serveur refait
  // les mêmes vérifications, mais l'aller-retour n'apporte rien quand l'erreur est évidente.
  function validate() {
    if (questions.length === 0) return 'Ajoutez au moins une question.';
    const value = Number(threshold);
    if (!Number.isInteger(value) || value < 1 || value > 100) return 'Le seuil de réussite doit être un nombre entier entre 1 et 100.';
    for (const [index, question] of questions.entries()) {
      const number = index + 1;
      if (!question.text.trim()) return `Question ${number} : saisissez l'énoncé.`;
      if (question.options.some((option) => !option.label.trim())) return `Question ${number} : une réponse est vide.`;
      if (!question.options.some((option) => option.is_correct)) return `Question ${number} : cochez au moins une bonne réponse.`;
    }
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);
    let data;
    try {
      ({ data } = await api.put(`/trainings/${training.id}/quiz`, { pass_threshold: Number(threshold), questions }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer le QCM.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved({ question_count: data.questions.length, pass_threshold: data.pass_threshold });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">QCM de la formation</h2>
            <p className="break-words text-sm text-slate-500">{training.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-16 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Ce QCM sert pour <strong>toutes les sessions</strong> de la formation. Cochez la ou les bonnes réponses de chaque question. Si la
              procédure évolue, modifiez-le ici : les liens déjà envoyés gardent la version reçue, seuls les prochains envois utilisent la nouvelle.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Seuil de réussite (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                inputMode="numeric"
                required
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={`${INPUT_CLASS} sm:max-w-[10rem]`}
              />
              <p className="mt-1 text-xs text-slate-400">Pourcentage minimal de questions justes pour que la formation soit « réussie ».</p>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => {
                const correctCount = question.options.filter((option) => option.is_correct).length;
                return (
                  <div key={question.id} className="rounded-lg border border-slate-200 p-3 sm:p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">Question {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        aria-label={`Supprimer la question ${index + 1}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <AutoTextarea
                      rows={2}
                      placeholder="Énoncé de la question"
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                      className={INPUT_CLASS}
                    />

                    <p className="mb-1.5 mt-3 text-xs font-medium text-slate-500">
                      Réponses proposées — cochez la ou les bonnes réponses
                      {correctCount > 1 && <span className="ml-1 text-primary">(plusieurs bonnes réponses : cases à cocher)</span>}
                    </p>
                    <ul className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <li key={option.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={option.is_correct}
                            onChange={(e) => updateOption(question.id, option.id, { is_correct: e.target.checked })}
                            aria-label={`Réponse ${optionIndex + 1} correcte`}
                            className="h-5 w-5 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <input
                            type="text"
                            placeholder={`Réponse ${optionIndex + 1}`}
                            value={option.label}
                            onChange={(e) => updateOption(question.id, option.id, { label: e.target.value })}
                            className={`${INPUT_CLASS} min-w-0 flex-1`}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(question.id, option.id)}
                            disabled={question.options.length <= MIN_OPTIONS}
                            aria-label={`Retirer la réponse ${optionIndex + 1}`}
                            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          >
                            <X size={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {question.options.length < MAX_OPTIONS && (
                      <button
                        type="button"
                        onClick={() => addOption(question.id)}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Plus size={13} />
                        Ajouter une réponse
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Plus size={16} />
              Ajouter une question
            </button>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : `Enregistrer le QCM (${questions.length} question${questions.length > 1 ? 's' : ''})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
