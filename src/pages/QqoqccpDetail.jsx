import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import CapaPriorityBadge from '../components/CapaPriorityBadge.jsx';
import QqoqccpStatusBadge from '../components/QqoqccpStatusBadge.jsx';

// Mêmes noms de champs que qqoqccp_analyses (schema.sql) et que le corps attendu par
// PATCH /api/qqoqccp/:id — voir backend/src/routes/qqoqccp.js.
const QUESTIONS = [
  { key: 'qui', label: 'Qui ?', placeholder: 'Qui est concerné ? Qui a détecté le problème ?' },
  { key: 'quoi', label: 'Quoi ?', placeholder: "Que s'est-il passé exactement ?" },
  { key: 'ou_', label: 'Où ?', placeholder: 'Où le problème a-t-il eu lieu ?' },
  { key: 'quand_', label: 'Quand ?', placeholder: 'Quand le problème est-il survenu ? À quelle fréquence ?' },
  { key: 'comment_', label: 'Comment ?', placeholder: "Comment le problème s'est-il produit ?" },
  { key: 'combien', label: 'Combien ?', placeholder: "Quel est l'impact, le coût, la quantité concernée ?" },
  { key: 'pourquoi', label: 'Pourquoi ?', placeholder: 'Pourquoi pense-t-on que cela s\'est produit ?' },
];
const MIN_FIELDS_FOR_GENERATE = 3;
const SAVE_DEBOUNCE_MS = 1000;

function buildForm(analysis) {
  const form = {};
  for (const { key } of QUESTIONS) {
    form[key] = analysis[key] || '';
  }
  return form;
}

export default function QqoqccpDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  // Par champ : undefined (rien à signaler) | 'saving' | 'saved' | 'error'
  const [fieldStatus, setFieldStatus] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const timers = useRef({});
  const savedTimers = useRef({});

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/qqoqccp/${id}`)
      .then(({ data }) => {
        setAnalysis(data);
        setForm(buildForm(data));
      })
      .catch(() => setError('Impossible de charger cette analyse.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Annule les sauvegardes en attente si on quitte la page avant la fin du débounce.
  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
      Object.values(savedTimers.current).forEach(clearTimeout);
    },
    []
  );

  function handleFieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldStatus((prev) => ({ ...prev, [field]: undefined }));

    if (timers.current[field]) clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(async () => {
      setFieldStatus((prev) => ({ ...prev, [field]: 'saving' }));
      try {
        await api.patch(`/qqoqccp/${id}`, { [field]: value });
        setFieldStatus((prev) => ({ ...prev, [field]: 'saved' }));
        if (savedTimers.current[field]) clearTimeout(savedTimers.current[field]);
        savedTimers.current[field] = setTimeout(() => {
          setFieldStatus((prev) => (prev[field] === 'saved' ? { ...prev, [field]: undefined } : prev));
        }, 2000);
      } catch {
        setFieldStatus((prev) => ({ ...prev, [field]: 'error' }));
      }
    }, SAVE_DEBOUNCE_MS);
  }

  const filledCount = QUESTIONS.filter(({ key }) => form[key]?.trim()).length;
  const canGenerate = filledCount >= MIN_FIELDS_FOR_GENERATE;
  const hasSuggestion = Boolean(analysis?.ai_synthesis);

  async function handleGenerate() {
    setGenerateError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/qqoqccp/${id}/generate`);
      setAnalysis(data);
    } catch (err) {
      setGenerateError(err.response?.data?.error || 'Impossible de générer une proposition IA.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error || !analysis) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {error || 'Analyse introuvable.'}
      </p>
    );
  }

  const suggestedActions = analysis.ai_suggested_actions?.suggested_actions || [];
  const rootCauses = analysis.ai_suggested_actions?.root_causes || [];
  const overallPriority = analysis.ai_suggested_actions?.overall_priority;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/qqoqccp')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{analysis.title}</h1>
        <QqoqccpStatusBadge status={analysis.status} />
      </div>

      <div className="mt-4 space-y-4">
        {QUESTIONS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">{label}</label>
              {fieldStatus[key] === 'saving' && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  Enregistrement...
                </span>
              )}
              {fieldStatus[key] === 'saved' && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <Check size={12} />
                  Enregistré
                </span>
              )}
              {fieldStatus[key] === 'error' && (
                <span className="text-xs text-red-600">Échec de l'enregistrement</span>
              )}
            </div>
            <textarea
              rows={2}
              placeholder={placeholder}
              value={form[key] || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div
          className="inline-block"
          title={!canGenerate ? `Remplissez au moins ${MIN_FIELDS_FOR_GENERATE} des 7 questions avant de générer une proposition.` : undefined}
        >
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Génération en cours...
              </>
            ) : hasSuggestion ? (
              <>
                <RefreshCw size={18} />
                Régénérer
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Générer une proposition IA
              </>
            )}
          </button>
        </div>
        {!canGenerate && (
          <p className="mt-1 text-xs text-slate-400">
            {filledCount}/{MIN_FIELDS_FOR_GENERATE} question{MIN_FIELDS_FOR_GENERATE > 1 ? 's' : ''} minimum remplie{filledCount > 1 ? 's' : ''}.
          </p>
        )}
        {generateError && <p className="mt-2 text-sm text-red-600">{generateError}</p>}
      </div>

      {hasSuggestion && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
              <Sparkles size={12} />
              Généré par IA
            </span>
            {overallPriority && <CapaPriorityBadge priority={overallPriority} />}
          </div>

          <p className="text-sm text-slate-700">{analysis.ai_synthesis}</p>

          {rootCauses.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Causes racines probables</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {rootCauses.map((cause, i) => (
                  <li key={i}>{cause}</li>
                ))}
              </ul>
            </div>
          )}

          {suggestedActions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Actions suggérées</h3>
              <div className="mt-2 space-y-2">
                {suggestedActions.map((action, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{action.title}</p>
                      <CapaPriorityBadge priority={action.suggested_priority} />
                    </div>
                    {action.description && <p className="mt-1 text-sm text-slate-600">{action.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
