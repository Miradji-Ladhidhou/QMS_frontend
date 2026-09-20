import { useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api } from '../../lib/api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

const RESULT_LABELS = {
  sent: { text: 'Lien envoyé', className: 'text-emerald-700', Icon: CheckCircle2 },
  no_email: { text: 'Aucun email : non envoyé', className: 'text-amber-700', Icon: AlertCircle },
  failed: { text: "Échec de l'envoi", className: 'text-red-700', Icon: AlertCircle },
  not_found: { text: 'Réalisation introuvable', className: 'text-red-700', Icon: AlertCircle },
};

// Envoi du lien de QCM (valable 48 h) aux personnes d'une session. Un compte reçoit le lien sur
// l'adresse de son compte ; pour un salarié sans compte, l'adresse se saisit ici (elle est
// mémorisée sur sa fiche) et devra être retapée par la personne pour ouvrir le lien.
// records : réalisations du groupe (session) ; employees : liste du personnel, pour préremplir
// l'email des salariés déjà renseignés.
export default function SendQuizModal({ training, sessionLabel, records, employees, hasSummary, onClose, onSent }) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const [selected, setSelected] = useState(() => new Set(records.map((record) => record.id)));
  const [emails, setEmails] = useState(() =>
    Object.fromEntries(records.filter((record) => record.employee_id).map((record) => [record.id, employeeById.get(record.employee_id)?.email || '']))
  );
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  function toggle(recordId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }

  const personLabel = (record) => record.user?.full_name || record.employee?.full_name || 'Personne';

  async function handleSubmit(event) {
    event.preventDefault();
    const chosen = records.filter((record) => selected.has(record.id));
    if (chosen.length === 0) {
      setError('Sélectionnez au moins une personne.');
      return;
    }
    const missing = chosen.find((record) => record.employee_id && !EMAIL_PATTERN.test((emails[record.id] || '').trim()));
    if (missing) {
      setError(`Saisissez une adresse email valide pour ${personLabel(missing)}.`);
      return;
    }

    setError('');
    setSending(true);
    let data;
    try {
      ({ data } = await api.post(`/trainings/${training.id}/quiz/invites`, {
        items: chosen.map((record) => ({
          record_id: record.id,
          ...(record.employee_id ? { email: emails[record.id].trim() } : {}),
        })),
      }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'envoyer les liens.");
      setSending(false);
      return;
    }
    setSending(false);
    setResults(data.results);
    onSent(data.results);
  }

  const nameByRecord = Object.fromEntries(records.map((record) => [record.id, personLabel(record)]));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Envoyer le QCM</h2>
            <p className="break-words text-sm text-slate-500">
              {training.title} · {sessionLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {results ? (
          <div>
            <ul className="space-y-2">
              {results.map((result) => {
                const label = RESULT_LABELS[result.status] || RESULT_LABELS.failed;
                return (
                  <li key={result.record_id} className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm">
                    <label.Icon size={16} className={`mt-0.5 shrink-0 ${label.className}`} />
                    <div className="min-w-0">
                      <p className="break-words font-medium text-slate-800">{result.person_name || nameByRecord[result.record_id]}</p>
                      <p className={`break-words text-xs ${label.className}`}>
                        {label.text}
                        {result.email ? ` — ${result.email}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Chaque lien est valable 48 h et permet une seule tentative. Le résultat met à jour la réalisation dès que la personne a validé son QCM.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Chaque personne reçoit un lien par email, <strong>valable 48 h</strong>, pour lire le résumé de la formation puis répondre au QCM.
              Elle devra <strong>saisir son adresse email</strong> pour accéder au questionnaire. Un nouvel envoi remplace le lien précédent.
              {!hasSummary && (
                <span className="mt-1 block text-amber-700">
                  Aucun résumé n'est saisi pour cette formation : seul le QCM sera proposé (ajoutez-le via « Modifier la formation »).
                </span>
              )}
            </p>

            <ul className="space-y-2">
              {records.map((record) => {
                const isEmployee = Boolean(record.employee_id);
                return (
                  <li key={record.id} className="rounded-md border border-slate-200 p-3">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(record.id)}
                        onChange={() => toggle(record.id)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 break-words text-sm font-medium text-slate-800">{personLabel(record)}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                        {isEmployee ? 'Sans compte' : 'Compte'}
                      </span>
                    </label>
                    {isEmployee ? (
                      selected.has(record.id) && (
                        <div className="mt-2">
                          <label className="mb-1 block text-xs font-medium text-slate-500">Adresse email de la personne</label>
                          <input
                            type="email"
                            inputMode="email"
                            autoComplete="off"
                            placeholder="prenom.nom@exemple.com"
                            value={emails[record.id] || ''}
                            onChange={(e) => setEmails((prev) => ({ ...prev, [record.id]: e.target.value }))}
                            className={INPUT_CLASS}
                          />
                        </div>
                      )
                    ) : (
                      <p className="ml-6 mt-1 text-xs text-slate-400">Envoyé à l'adresse de son compte.</p>
                    )}
                  </li>
                );
              })}
            </ul>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {sending ? 'Envoi en cours...' : `Envoyer à ${selected.size} personne${selected.size > 1 ? 's' : ''}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
