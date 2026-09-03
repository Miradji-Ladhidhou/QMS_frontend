import { useState } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';

// Même bloc/style qu'AiCapaSuggestion.jsx (bouton violet, encadré en pointillés) — appelé
// avant même que la procédure existe (voir POST /procedures/generate-draft), le résultat ne
// fait que préremplir ProcedureSectionsEditor, jamais publié tel quel.
//
// title/process : valeurs actuelles du formulaire de création. onGenerated(content) : appelé
// à la réception, pour préremplir l'éditeur de sections.
export default function AiProcedureDraft({ title, process, onGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);

  const canGenerate = title && title.trim().length >= 3;

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/procedures/generate-draft', { title, process });
      setHasGenerated(true);
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
    </div>
  );
}
