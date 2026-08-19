import { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import CapaPriorityBadge from './CapaPriorityBadge.jsx';

// Bloc IA partagé par tous les flux "créer une CAPA depuis X" (audits, revues,
// réclamations, risques, fournisseurs) — même rendu que la suggestion QQOQCCP
// (QqoqccpDetail.jsx), qui reste la seule à persister la sienne en base (voir
// backend/src/routes/ai.js) : ici la suggestion ne vit que le temps de la modale.
//
// context : texte libre décrivant la situation, assemblé par l'appelant.
// onGenerated(suggestion) : appelé une fois à la réception, pour préremplir cause
//   identifiée / action préventive / priorité (comme handleOpenCapaForm côté QQOQCCP).
// onSelectAction(action) : appelé quand l'utilisateur choisit une action suggérée, pour
//   préremplir uniquement l'action corrective.
export default function AiCapaSuggestion({ context, onGenerated, onSelectAction }) {
  const [suggestion, setSuggestion] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = context && context.trim().length >= 10;

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/capa-suggestion', { context });
      setSuggestion(data);
      setSelectedIndex(null);
      onGenerated?.(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer une suggestion IA.');
    } finally {
      setGenerating(false);
    }
  }

  function handleSelectAction(index) {
    setSelectedIndex(index);
    onSelectAction?.(suggestion.suggested_actions[index]);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate || generating}
        className="flex items-center gap-2 rounded-md border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Génération en cours...
          </>
        ) : suggestion ? (
          <>
            <RefreshCw size={16} />
            Régénérer
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Générer avec l'IA
          </>
        )}
      </button>
      {!canGenerate && <p className="mt-1 text-xs text-slate-400">Complétez le contexte ci-dessus pour activer la suggestion IA.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {suggestion && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
              <Sparkles size={12} />
              Généré par IA
            </span>
            {suggestion.overall_priority && <CapaPriorityBadge priority={suggestion.overall_priority} />}
          </div>

          <p className="text-sm text-slate-700">{suggestion.synthesis}</p>

          {suggestion.root_causes?.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Causes racines probables</h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {suggestion.root_causes.map((cause, i) => (
                  <li key={i}>{cause}</li>
                ))}
              </ul>
            </div>
          )}

          {suggestion.suggested_actions?.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions correctives suggérées — cliquez pour préremplir
              </h4>
              <div className="mt-1.5 space-y-2">
                {suggestion.suggested_actions.map((action, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleSelectAction(i)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedIndex === i ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{action.title}</p>
                      <CapaPriorityBadge priority={action.suggested_priority} />
                    </div>
                    {action.description && <p className="mt-1 text-sm text-slate-600">{action.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestion.preventive_actions?.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions préventives suggérées</h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {suggestion.preventive_actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
