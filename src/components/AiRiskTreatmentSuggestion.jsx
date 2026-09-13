import { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { LIKELIHOOD_LABELS, IMPACT_LABELS } from '../lib/riskStatus.js';

// Complète la couverture IA du registre des risques : AiRiskSuggestion.jsx aide à
// l'identification (créer des risques depuis un service), celui-ci aide au traitement d'un
// risque déjà identifié — suggère un plan de traitement et l'évaluation résiduelle atteignable
// une fois ce plan appliqué (POST /ai/risk-treatment-suggestion, backend/src/services/groq.js).
// Même rendu que AiCapaSuggestion.jsx (une seule suggestion, préremplit le formulaire via
// onGenerated) plutôt qu'une liste à cocher comme AiRiskSuggestion.jsx : il n'y a ici qu'UN
// risque à traiter, pas plusieurs candidats parmi lesquels choisir.
export default function AiRiskTreatmentSuggestion({ title, description, category, type, likelihood, impact, currentControls, onGenerated }) {
  const [suggestion, setSuggestion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = Boolean(title && title.trim());

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/risk-treatment-suggestion', {
        title,
        description,
        category,
        type,
        likelihood,
        impact,
        current_controls: currentControls,
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
            Suggérer un plan de traitement avec l'IA
          </>
        )}
      </button>
      {!canGenerate && <p className="mt-1 text-xs text-slate-400">Renseignez un titre pour activer la suggestion IA.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {suggestion && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
              <Sparkles size={12} />
              Généré par IA — déjà appliqué au formulaire ci-dessous
            </span>
            {suggestion.residual_likelihood && suggestion.residual_impact && (
              <span className="text-xs font-medium text-slate-500">
                Résiduel estimé : P{suggestion.residual_likelihood} ({LIKELIHOOD_LABELS[suggestion.residual_likelihood]}) · G
                {suggestion.residual_impact} ({IMPACT_LABELS[suggestion.residual_impact]})
              </span>
            )}
          </div>

          <p className="text-sm text-slate-700">{suggestion.treatment_plan}</p>

          {suggestion.rationale && <p className="mt-2 text-xs italic text-slate-500">{suggestion.rationale}</p>}
        </div>
      )}
    </div>
  );
}
