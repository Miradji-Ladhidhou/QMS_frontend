import { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';

// Suite logique d'AiCcpSignificanceSuggestion.jsx : une fois un danger jugé significatif,
// suggère les limites critiques et les procédures de surveillance/action corrective/
// vérification/enregistrement de son point critique de maîtrise (CCP) — POST
// /ai/haccp-ccp-suggestion, backend/src/services/groq.js. Même rendu qu'AiCapaSuggestion.jsx :
// une seule suggestion, préremplit le formulaire via onGenerated.
export default function AiCcpDefinitionSuggestion({ hazardType, description, existingControls, likelihood, severity, justification, onGenerated }) {
  const [suggestion, setSuggestion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = Boolean(description && description.trim());

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/haccp-ccp-suggestion', {
        hazardType,
        description,
        existingControls,
        likelihood,
        severity,
        justification,
      });
      setSuggestion(data);
      onGenerated?.(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer une suggestion IA.');
    } finally {
      setGenerating(false);
    }
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
            Suggérer le point critique avec l'IA
          </>
        )}
      </button>
      {!canGenerate && <p className="mt-1 text-xs text-slate-400">Le danger d'origine doit avoir une description pour activer la suggestion IA.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {suggestion && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
            <Sparkles size={12} />
            Généré par IA — déjà appliqué aux champs ci-dessous
          </span>
          <p className="mt-2 text-sm text-slate-700">{suggestion.critical_limits}</p>
        </div>
      )}
    </div>
  );
}
