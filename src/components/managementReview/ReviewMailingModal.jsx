import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import AutoTextarea from '../AutoTextarea.jsx';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_LABELS = {
  sent: { text: 'Envoyé', className: 'text-emerald-700', Icon: CheckCircle2 },
  failed: { text: "Échec de l'envoi", className: 'text-red-700', Icon: AlertCircle },
  no_email: { text: 'Aucune adresse email', className: 'text-amber-700', Icon: AlertCircle },
};

// Envoi d'une convocation (ordre du jour + invitation calendrier) ou du compte rendu signé (PDF joint). Destinataires :
// comptes et salariés avec adresse (les personnes citées dans « Participants » sont présélectionnées) + adresses libres.
export default function ReviewMailingModal({ review, kind, onClose, onSent }) {
  const [people, setPeople] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [extraEmails, setExtraEmails] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const isConvocation = kind === 'convocation';

  useEffect(() => {
    api
      .get('/management-reviews/recipients')
      .then(({ data }) => {
        setPeople(data);
        // Présélection : les personnes dont le nom figure dans la liste des participants de la revue.
        const participants = (review.participants || '').toLowerCase();
        setSelected(new Set(data.filter((person) => person.name && participants.includes(person.name.toLowerCase())).map((person) => `${person.kind}:${person.id}`)));
      })
      .catch(() => {
        setPeople([]);
        setError('Impossible de charger les destinataires.');
      });
  }, [review.participants]);

  const extras = useMemo(() => extraEmails.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean), [extraEmails]);
  const total = selected.size + extras.length;

  function toggle(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    const invalid = extras.find((email) => !EMAIL_PATTERN.test(email));
    if (invalid) {
      setError(`Adresse invalide : ${invalid}`);
      return;
    }
    if (total === 0) {
      setError('Sélectionnez au moins un destinataire.');
      return;
    }

    setError('');
    setSending(true);
    let data;
    try {
      ({ data } = await api.post(`/management-reviews/${review.id}/send-${kind}`, {
        recipients: people.filter((person) => selected.has(`${person.kind}:${person.id}`)).map((person) => ({ kind: person.kind, id: person.id })),
        extra_emails: extras,
        ...(isConvocation ? { meeting_time: meetingTime || undefined, location: location || undefined } : {}),
        message: message || undefined,
      }));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'envoyer.");
      setSending(false);
      return;
    }
    setSending(false);
    setResults(data.results);
    onSent(data.mailing);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Mail size={18} className="text-primary" />
              {isConvocation ? 'Convoquer à la revue' : 'Envoyer le compte rendu'}
            </h2>
            <p className="break-words text-sm text-slate-500">{review.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {results ? (
          <div>
            <ul className="space-y-2">
              {results.map((result, index) => {
                const label = STATUS_LABELS[result.status] || STATUS_LABELS.failed;
                return (
                  <li key={index} className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm">
                    <label.Icon size={16} className={`mt-0.5 shrink-0 ${label.className}`} />
                    <div className="min-w-0">
                      <p className="break-words font-medium text-slate-800">{result.name || result.email}</p>
                      <p className={`break-words text-xs ${label.className}`}>
                        {label.text}
                        {result.email && result.name ? ` — ${result.email}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {isConvocation
                ? "Chaque personne reçoit un email avec la date, l'ordre du jour de la revue et une invitation calendrier (.ics)."
                : 'Chaque personne reçoit le compte rendu validé et signé en PDF, avec la liste des actions décidées.'}{' '}
              Personne ne voit les autres destinataires.
            </p>

            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Destinataires</p>
              {people === null ? (
                <div className="h-20 animate-pulse rounded-md bg-slate-100" />
              ) : people.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune personne avec une adresse email. Ajoutez des adresses ci-dessous.</p>
              ) : (
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {people.map((person) => {
                    const key = `${person.kind}:${person.id}`;
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-1.5 text-sm hover:bg-slate-50">
                          <input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary" />
                          <span className="min-w-0 flex-1 break-words">
                            <span className="font-medium text-slate-800">{person.name}</span>
                            <span className="ml-1.5 text-xs text-slate-400">{person.email}</span>
                          </span>
                          {person.kind === 'employee' && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">Sans compte</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Autres adresses (séparées par des virgules ou des espaces)</label>
              <AutoTextarea rows={1} placeholder="direction@exemple.com, auditeur@exemple.com" value={extraEmails} onChange={(e) => setExtraEmails(e.target.value)} className={INPUT_CLASS} />
            </div>

            {isConvocation && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Heure (facultatif)</label>
                  <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Lieu (facultatif)</label>
                  <input type="text" maxLength={200} placeholder="Salle de réunion" value={location} onChange={(e) => setLocation(e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Message (facultatif)</label>
              <AutoTextarea rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} className={INPUT_CLASS} />
            </div>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={sending || total === 0}
              className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {sending ? 'Envoi en cours...' : `Envoyer à ${total} personne${total > 1 ? 's' : ''}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
