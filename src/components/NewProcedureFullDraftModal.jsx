import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2, Settings as SettingsIcon, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useProcedureFullDraftJob } from '../lib/useProcedureFullDraftJob.js';

// Parcours dédié "Nouvelle procédure — génération complète" depuis la liste des procédures :
// contrairement au bouton "Document complet (IA)" niché dans le formulaire de création manuelle
// (AiProcedureDraft.jsx/AiFullProcedureDraft.jsx, toujours disponibles pour qui préfère partir
// du formulaire), celui-ci guide l'utilisateur qui sait dès le départ vouloir un document
// complet : un sujet, un rappel du style qui sera appliqué, une progression claire, puis la
// main est rendue à NewProcedureModal (Procedures.jsx) déjà préremplie — jamais un éditeur
// dédié en plus, pour ne pas dupliquer ProcedureSectionsEditor.
//
// template : la ligne procedure_templates du tenant (déjà chargée par Procedures.jsx).
// onGenerated(subject, content) : appelé une fois le job terminé — le parent ferme cette modale
// et ouvre NewProcedureModal avec ce contenu. onClose : ferme sans avoir généré (ou après
// confirmation si une génération est en cours, pour ne pas perdre la progression sans prévenir).
export default function NewProcedureFullDraftModal({ template, onClose, onGenerated }) {
  const [subject, setSubject] = useState('');
  const [presets, setPresets] = useState([]);
  const { job, starting, error, isRunning, progress, start } = useProcedureFullDraftJob();

  useEffect(() => {
    api
      .get('/procedure-templates/presets')
      .then(({ data }) => setPresets(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (job?.status === 'completed') onGenerated?.(subject, job.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  function handleClose() {
    if (isRunning && !window.confirm('Une génération est en cours. Fermer maintenant sans récupérer le résultat ?')) {
      return;
    }
    onClose();
  }

  const canGenerate = subject.trim().length >= 3;
  const activePreset = presets.find((p) => p.id === template?.active_preset_id);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle procédure — génération complète</h2>
          <button type="button" onClick={handleClose} aria-label="Fermer" className="p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Décrivez le sujet en quelques mots (ex. « procédure de préparation de commande ») — l'IA rédige un document
          complet, section par section, que vous n'aurez plus qu'à relire, corriger et illustrer.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Sujet de la procédure</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={starting || isRunning}
            placeholder="Ex. procédure de préparation de commande"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-60"
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
          <span className="text-slate-600">
            Style de gabarit : <span className="font-medium text-slate-800">{activePreset?.name || 'gabarit personnalisé'}</span>
          </span>
          <Link
            to="/settings?tab=procedures"
            className="flex shrink-0 items-center gap-1 text-primary hover:text-primary-700"
          >
            <SettingsIcon size={14} />
            Changer
          </Link>
        </div>

        {!isRunning && !job && (
          <button
            type="button"
            onClick={() => start(subject)}
            disabled={!canGenerate || starting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            {starting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            {starting ? 'Lancement...' : 'Générer le document complet'}
          </button>
        )}
        {!canGenerate && !isRunning && (
          <p className="mt-1 text-xs text-slate-400">Décrivez le sujet en 3 caractères minimum pour lancer la génération.</p>
        )}

        {isRunning && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{job.current_step_label || 'Élaboration du plan de la procédure...'}</p>
            <p className="mt-1 text-xs text-slate-400">
              Cette opération peut prendre plusieurs dizaines de secondes ({job.completed_steps || 0}/{job.total_steps || '?'} sections).
            </p>
          </div>
        )}

        {job?.status === 'failed' && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {job.error || 'La génération a échoué.'}
          </p>
        )}
        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
