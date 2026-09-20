import { FileText, Loader2, X } from 'lucide-react';
import { attemptStatus, describeAttemptsSummary, numberAttempts, summarizeAttempts } from '../../lib/quizAttempts.js';

const TONE_CLASSES = {
  good: 'bg-emerald-100 text-emerald-700',
  bad: 'bg-red-100 text-red-700',
  pending: 'bg-sky-100 text-sky-700',
  muted: 'bg-slate-100 text-slate-500',
};

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

// Historique de TOUS les passages de QCM d'une personne pour une session : échecs, réussites et
// liens jamais utilisés, avec un export Word par essai passé (chaque Word reprend l'historique complet).
export default function QuizHistoryModal({ training, personLabel, sessionLabel, attempts, downloadingId, onDownload, onClose }) {
  const history = numberAttempts(attempts).reverse(); // du plus récent au plus ancien
  const summary = summarizeAttempts(attempts);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Historique des essais</h2>
            <p className="break-words text-sm text-slate-500">
              {personLabel} · {training.title}
            </p>
            <p className="text-xs text-slate-400">{sessionLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-slate-200 p-2.5">
            <p className="text-xl font-semibold text-slate-900">{summary.total}</p>
            <p className="text-xs text-slate-500">essai{summary.total > 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
            <p className="text-xl font-semibold text-emerald-700">{summary.successes}</p>
            <p className="text-xs text-emerald-700">réussite{summary.successes > 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
            <p className="text-xl font-semibold text-red-700">{summary.failures}</p>
            <p className="text-xs text-red-700">échec{summary.failures > 1 ? 's' : ''}</p>
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          {describeAttemptsSummary(summary)}. Un lien jamais utilisé (expiré ou remplacé par un nouvel envoi) n'est pas compté comme un essai.
        </p>

        <ul className="space-y-2">
          {history.map((attempt) => {
            const status = attemptStatus(attempt);
            return (
              <li key={attempt.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{attempt.attempt_number ? `Essai n°${attempt.attempt_number}` : 'Lien envoyé'}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[status.tone]}`}>{status.label}</span>
                </div>
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <dt>Envoyé le</dt>
                  <dd className="text-slate-700">{formatDateTime(attempt.sent_at)}</dd>
                  {attempt.completed_at && (
                    <>
                      <dt>Passé le</dt>
                      <dd className="text-slate-700">{formatDateTime(attempt.completed_at)}</dd>
                      <dt>Score</dt>
                      <dd className="text-slate-700">
                        {attempt.correct_count}/{attempt.total_count} — {attempt.score_percent} % (seuil {attempt.pass_threshold} %)
                      </dd>
                    </>
                  )}
                </dl>
                {attempt.completed_at && (
                  <button
                    type="button"
                    onClick={() => onDownload(attempt)}
                    disabled={downloadingId === attempt.id}
                    className="mt-2 flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {downloadingId === attempt.id ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                    QCM Word
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-md border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
