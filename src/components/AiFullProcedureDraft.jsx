import { useEffect } from 'react';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { useProcedureFullDraftJob } from '../lib/useProcedureFullDraftJob.js';

// Option distincte d'AiProcedureDraft.jsx, pas un remplacement : lance le pipeline multi-appels
// (voir POST /procedures/generate-full-draft, services/procedureFullDraftJob.js côté backend)
// qui produit un document complet section par section — plus lent (~10-15 appels IA) donc suivi
// par un job persistant plutôt qu'une réponse synchrone (voir lib/useProcedureFullDraftJob.js,
// partagé avec NewProcedureFullDraftModal.jsx qui offre le même pipeline en parcours dédié
// depuis la liste des procédures).
//
// title : réutilisé tel quel comme sujet, pas de champ dupliqué. onGenerated(content) : appelé
// une fois le job terminé, pour préremplir l'éditeur de sections (même contrat qu'AiProcedureDraft).
export default function AiFullProcedureDraft({ title, onGenerated }) {
  const { job, starting, error, isRunning, progress, start } = useProcedureFullDraftJob();

  const canGenerate = title && title.trim().length >= 3;

  useEffect(() => {
    if (job?.status === 'completed') onGenerated?.(job.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  return (
    <div>
      <button
        type="button"
        onClick={() => start(title)}
        disabled={!canGenerate || starting || isRunning}
        className="flex items-center gap-2 rounded-md border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50"
      >
        {starting || isRunning ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        {isRunning ? 'Génération en cours...' : 'Document complet (IA)'}
      </button>
      {!canGenerate && <p className="mt-1 text-xs text-slate-400">Renseignez au moins le titre pour activer la génération IA.</p>}

      {isRunning && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {job.current_step_label || 'Préparation du plan de la procédure...'}
          </p>
        </div>
      )}

      {job?.status === 'completed' && job.failed_subsections?.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {job.failed_subsections.length} sous-section{job.failed_subsections.length > 1 ? 's' : ''} n'
          {job.failed_subsections.length > 1 ? 'ont' : 'a'} pas pu être générée
          {job.failed_subsections.length > 1 ? 's' : ''} automatiquement et {job.failed_subsections.length > 1 ? 'sont' : 'est'} à
          compléter manuellement dans le document.
        </p>
      )}

      {job?.status === 'failed' && <p className="mt-2 text-sm text-red-600">{job.error || 'La génération a échoué.'}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
