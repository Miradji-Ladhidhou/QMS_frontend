import { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { withAiModule } from '../lib/aiModules.jsx';
import { generateAi, useSavedAiResult } from '../lib/aiGenerations.js';
import AiResultDeleteButton from './AiResultDeleteButton.jsx';

// Même bloc/style qu'AiCapaSuggestion.jsx (bouton violet, encadré en pointillés) — appelé
// avant même que la procédure existe (voir POST /procedures/generate-draft), le résultat ne
// fait que préremplir ProcedureSectionsEditor, jamais publié tel quel.
//
// title/process : valeurs actuelles du formulaire de création. onGenerated(content) : appelé
// à la réception, pour préremplir l'éditeur de sections.
export default withAiModule('procedures', AiProcedureDraft);
function AiProcedureDraft({ title, process, onGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);

  const canGenerate = title && title.trim().length >= 3;
  useSavedAiResult(canGenerate ? '/procedures/generate-draft' : null, { title, process }, (data) => {
    setHasGenerated(Boolean(data));
    setSavedDraft(data);
  }, setError);

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await generateAi('/procedures/generate-draft', { title, process }, hasGenerated);
      setHasGenerated(true);
      setSavedDraft(data);
      onGenerated?.(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer un brouillon IA.');
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
        ) : hasGenerated ? (
          <>
            <RefreshCw size={16} />
            Régénérer un brouillon
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Générer un brouillon avec l'IA
          </>
        )}
      </button>
      {!canGenerate && <p className="mt-1 text-xs text-slate-400">Renseignez au moins le titre pour activer la génération IA.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {savedDraft && <AiResultDeleteButton endpoint="/procedures/generate-draft" input={{ title, process }}
        disabled={generating} onDeleted={() => { setSavedDraft(null); setHasGenerated(false); }} onError={setError} />}
      {savedDraft && (
        <button type="button" onClick={() => onGenerated?.(savedDraft)}
          className="mt-2 text-sm font-medium text-purple-700 hover:text-purple-800">
          Utiliser le brouillon enregistré ({savedDraft.sections?.length || 0} sections) — sans appel IA
        </button>
      )}
    </div>
  );
}
