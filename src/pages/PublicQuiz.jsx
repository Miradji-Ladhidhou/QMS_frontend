import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Lock, XCircle } from 'lucide-react';
import { publicApi } from '../lib/publicApi.js';
import AppLogo from '../components/AppLogo.jsx';
import SignaturePad from '../components/SignaturePad.jsx';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Message affiché quand le lien ne permet plus (ou pas) de passer le QCM.
const BLOCKED_STATES = {
  completed: { Icon: CheckCircle2, tone: 'text-emerald-600', title: 'QCM déjà passé', text: 'Votre résultat a bien été enregistré. Vous pouvez fermer cette page.' },
  expired: {
    Icon: Clock,
    tone: 'text-amber-600',
    title: 'Lien expiré',
    text: 'Ce lien n\'est plus valable (durée de 48 h). Demandez un nouveau lien à votre responsable formation.',
  },
  locked: {
    Icon: Lock,
    tone: 'text-red-600',
    title: 'Lien verrouillé',
    text: 'Trop d\'adresses email erronées ont été saisies. Demandez un nouveau lien à votre responsable formation.',
  },
  invalid: { Icon: AlertCircle, tone: 'text-red-600', title: 'Lien invalide', text: 'Ce lien n\'existe pas ou est incomplet. Vérifiez l\'email reçu.' },
};

function Shell({ tenantName, children }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <AppLogo className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              QMS <span className="font-normal text-slate-400">SaaS</span>
            </p>
            {tenantName && <p className="truncate text-xs text-slate-500">{tenantName}</p>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{children}</div>
      </div>
    </div>
  );
}

function BlockedNotice({ state }) {
  const { Icon, tone, title, text } = BLOCKED_STATES[state] || BLOCKED_STATES.invalid;
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <Icon size={36} className={tone} />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{text}</p>
    </div>
  );
}

// Page ouverte SANS compte depuis le lien reçu par email : 1) confirmation de l'adresse email,
// 2) lecture du résumé de la formation, 3) QCM, 4) résultat. Une seule tentative par lien.
export default function PublicQuiz() {
  const { token } = useParams();
  const [phase, setPhase] = useState('loading'); // loading | blocked | email | summary | quiz | result
  const [blockedState, setBlockedState] = useState('invalid');
  const [meta, setMeta] = useState({ tenant_name: '', training_title: '' });
  const [email, setEmail] = useState('');
  const [content, setContent] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Le jeton est dans l'adresse : ni indexation par un moteur de recherche, ni transmission dans
  // l'en-tête Referer si la personne suit un lien sortant.
  useEffect(() => {
    const tags = [
      ['robots', 'noindex, nofollow'],
      ['referrer', 'no-referrer'],
    ].map(([name, content]) => {
      const tag = document.createElement('meta');
      tag.name = name;
      tag.content = content;
      document.head.appendChild(tag);
      return tag;
    });
    return () => tags.forEach((tag) => tag.remove());
  }, []);

  useEffect(() => {
    publicApi
      .get(`/quiz/${token}`)
      .then(({ data }) => {
        setMeta(data);
        if (data.state === 'valid') {
          setPhase('email');
        } else {
          setBlockedState(data.state);
          setPhase('blocked');
        }
      })
      .catch(() => {
        setBlockedState('invalid');
        setPhase('blocked');
      });
  }, [token]);

  // Erreur d'un appel public : si le lien est devenu inutilisable (expiré, verrouillé, déjà passé),
  // on bascule sur l'écran correspondant plutôt que d'afficher un simple message d'erreur.
  function handleApiError(err, fallback) {
    const state = err.response?.data?.state;
    if (state === 'completed' || state === 'expired' || state === 'locked') {
      setBlockedState(state);
      setPhase('blocked');
      return;
    }
    setError(err.response?.data?.error || fallback);
  }

  async function handleStart(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await publicApi.post(`/quiz/${token}/start`, { email });
      setContent(data);
      setMeta({ tenant_name: data.tenant_name, training_title: data.training_title });
      setPhase(data.summary ? 'summary' : 'quiz');
    } catch (err) {
      handleApiError(err, 'Impossible d\'accéder au QCM. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  const questions = content?.questions || [];
  const answeredCount = useMemo(() => questions.filter((question) => (answers[question.id] || []).length > 0).length, [questions, answers]);
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const canSubmit = allAnswered && Boolean(signature);

  function selectOption(question, optionId) {
    setAnswers((prev) => {
      const current = prev[question.id] || [];
      if (!question.multiple) return { ...prev, [question.id]: [optionId] };
      return { ...prev, [question.id]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId] };
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!window.confirm('Valider vos réponses ? Vous ne pourrez plus les modifier.')) return;
    setError('');
    setBusy(true);
    try {
      const { data } = await publicApi.post(`/quiz/${token}/submit`, { email, answers, signature });
      setResult(data);
      setPhase('result');
    } catch (err) {
      handleApiError(err, 'Impossible d\'enregistrer vos réponses. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <p className="py-6 text-center text-sm text-slate-500">Chargement...</p>
      </Shell>
    );
  }

  if (phase === 'blocked') {
    return (
      <Shell tenantName={meta.tenant_name}>
        <BlockedNotice state={blockedState} />
      </Shell>
    );
  }

  if (phase === 'email') {
    return (
      <Shell tenantName={meta.tenant_name}>
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{meta.training_title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pour accéder au résumé de la formation et au QCM, saisissez l'adresse email à laquelle vous avez reçu ce lien.
        </p>
        <form onSubmit={handleStart} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Votre adresse email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="prenom.nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? 'Vérification...' : 'Accéder'}
          </button>
        </form>
      </Shell>
    );
  }

  if (phase === 'summary') {
    return (
      <Shell tenantName={meta.tenant_name}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Résumé de la formation</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">{meta.training_title}</h1>
        {content.person_name && <p className="mt-1 text-sm text-slate-500">{content.person_name}</p>}
        <div className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{content.summary}</div>
        <button
          type="button"
          onClick={() => setPhase('quiz')}
          className="mt-5 w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700"
        >
          J'ai lu le résumé — passer au QCM
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">
          {questions.length} question{questions.length > 1 ? 's' : ''} · seuil de réussite {content.pass_threshold} %
        </p>
      </Shell>
    );
  }

  if (phase === 'quiz') {
    return (
      <Shell tenantName={meta.tenant_name}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">QCM</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">{meta.training_title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {questions.length} question{questions.length > 1 ? 's' : ''} · seuil de réussite {content.pass_threshold} % · une seule tentative
        </p>

        <div className="mt-5 space-y-5">
          {questions.map((question, index) => (
            <div key={question.id} role="group" aria-labelledby={`question-${question.id}`} className="rounded-lg border border-slate-200 p-4">
              <p id={`question-${question.id}`} className="text-sm font-semibold text-slate-800">
                {index + 1}. {question.text}
              </p>
              <p className="mb-2 mt-0.5 text-xs text-slate-400">{question.multiple ? 'Plusieurs réponses possibles' : 'Une seule réponse'}</p>
              <div className="space-y-2">
                {question.options.map((option) => {
                  const checked = (answers[question.id] || []).includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                        checked ? 'border-primary bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type={question.multiple ? 'checkbox' : 'radio'}
                        name={`question-${question.id}`}
                        checked={checked}
                        onChange={() => selectOption(question, option.id)}
                        className="mt-0.5 h-5 w-5 shrink-0 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 break-words text-slate-700">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">Votre signature</p>
          <p className="mb-2 mt-0.5 text-xs text-slate-500">
            En signant, je certifie avoir répondu personnellement à ce QCM. Elle figurera sur le compte rendu conservé par votre entreprise.
          </p>
          <SignaturePad onChange={setSignature} disabled={busy} />
        </div>

        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="sticky bottom-0 -mx-5 mt-5 border-t border-slate-100 bg-white px-5 pb-1 pt-3 sm:-mx-7 sm:px-7">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || busy}
            className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? 'Envoi...' : 'Valider mes réponses'}
          </button>
          <p className="mt-1.5 text-center text-xs text-slate-400">
            {answeredCount} / {questions.length} question{questions.length > 1 ? 's' : ''} répondue{answeredCount > 1 ? 's' : ''}
            {allAnswered && !signature && ' · signature manquante'}
          </p>
        </div>
      </Shell>
    );
  }

  // phase === 'result'
  const passed = result.passed;
  return (
    <Shell tenantName={meta.tenant_name}>
      <div className="flex flex-col items-center py-2 text-center">
        {passed ? <CheckCircle2 size={44} className="text-emerald-600" /> : <XCircle size={44} className="text-red-600" />}
        <h1 className="mt-3 text-xl font-semibold text-slate-900">{passed ? 'QCM réussi' : 'QCM non réussi'}</h1>
        {result.attempt_number > 0 && <p className="text-sm text-slate-500">Essai n°{result.attempt_number}</p>}
        <p className="mt-1 text-3xl font-semibold text-slate-900">{result.score_percent} %</p>
        <p className="text-sm text-slate-500">
          {result.correct_count} / {result.total_count} bonnes réponses · seuil de réussite {result.pass_threshold} %
        </p>
        <p className="mt-4 max-w-sm text-sm text-slate-600">
          {passed
            ? 'Votre résultat a été enregistré dans votre dossier de formation.'
            : 'Votre résultat a été enregistré. Votre responsable formation vous recontactera si un nouveau passage est nécessaire.'}
        </p>
        <p className="mt-2 text-xs text-slate-400">Vous pouvez fermer cette page.</p>
      </div>
    </Shell>
  );
}
