import { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';

// Complète la couverture IA du module HACCP : AiHazardSuggestion.jsx aide à identifier les
// dangers d'une étape, celui-ci aide à trancher si un danger déjà décrit est significatif
// (nécessite un point critique de maîtrise, CCP) — arbre de décision Codex Alimentarius
// appliqué en une fois (POST /ai/haccp-significance-suggestion, backend/src/services/groq.js).
// Même rendu qu'AiCapaSuggestion.jsx/AiRiskTreatmentSuggestion.jsx : une seule suggestion,
// préremplit le formulaire via onGenerated.
//
// laterSteps (étapes du plan postérieures à celle du danger, voir HaccpDetail.jsx) : sans ça,
// la question 4 de l'arbre de décision ("une étape ultérieure élimine-t-elle le danger ?") ne
// peut être que supposée par l'IA plutôt que vérifiée — un test manuel a montré qu'elle
// suppose alors l'existence d'une cuisson en aval même quand rien ne l'indique. Optionnel :
// undefined si le danger est sur la dernière étape du plan.
export default function AiCcpSignificanceSuggestion({
  hazardType,
  description,
  existingControls,
  likelihood,
  severity,
  laterSteps,
  onGenerated,
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = Boolean(description && description.trim());

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/haccp-significance-suggestion', {
        hazardType,
        description,
        existingControls,
        likelihood,
        severity,
        laterSteps: laterSteps?.map((s) => ({ name: s.name, description: s.description })),
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
            Évaluer avec l'IA (arbre de décision Codex)
          </>
        )}
      </button>
      {!canGenerate && <p className="mt-1 text-xs text-slate-400">Décrivez le danger pour activer la suggestion IA.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {suggestion && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
              <Sparkles size={12} />
              Généré par IA — déjà appliqué au formulaire ci-dessus
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                suggestion.is_significant ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {suggestion.is_significant ? 'CCP nécessaire' : 'Pas de CCP'}
            </span>
          </div>
          <p className="text-sm text-slate-700">{suggestion.justification}</p>
        </div>
      )}
    </div>
  );
}
