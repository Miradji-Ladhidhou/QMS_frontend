import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { HAZARD_TYPE_LABELS } from '../lib/haccpStatus.js';

const SEVERITY_STYLES = {
  high: 'border-red-200 bg-red-50 text-red-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
};

const SEVERITY_LABELS = { high: 'Prioritaire', medium: 'À vérifier', low: 'Piste' };

export default function AiHaccpSurveillanceSuggestion({ plan, canManage, onOpenCcpEditor }) {
  const [suggestions, setSuggestions] = useState(null);
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applyingId, setApplyingId] = useState('');
  const [confirmedIds, setConfirmedIds] = useState([]);
  const [error, setError] = useState('');

  const hazards = plan.steps.flatMap((step) => step.hazards.map((hazard) => ({ ...hazard, stepName: step.name })));
  const analysisSignature = JSON.stringify(
    hazards.map(({ id, is_significant, justification, ccp }) => ({
      id,
      is_significant,
      justification,
      ccpId: ccp?.id,
      criticalLimits: ccp?.critical_limits,
    }))
  );

  useEffect(() => {
    setSuggestions(null);
    setSummary('');
    setConfirmedIds([]);
  }, [analysisSignature]);

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/haccp-surveillance-suggestion', {
        planTitle: plan.title,
        productDescription: plan.product_description || '',
        scope: plan.scope || '',
        steps: plan.steps.map((step) => ({
          name: step.name,
          description: step.description || '',
          hazards: step.hazards.map((hazard) => ({
            id: hazard.id,
            hazard_type: hazard.hazard_type,
            description: hazard.description,
            existing_controls: hazard.existing_controls || '',
            likelihood: hazard.likelihood,
            severity: hazard.severity,
            is_significant: hazard.is_significant,
            justification: hazard.justification || '',
            has_ccp: Boolean(hazard.ccp),
          })),
        })),
      });
      setSuggestions(data.suggestions || []);
      setSummary(data.summary || '');
      setConfirmedIds([]);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de générer les propositions de surveillance.");
    } finally {
      setGenerating(false);
    }
  }

  function toggleConfirmation(hazardId) {
    setConfirmedIds((previous) =>
      previous.includes(hazardId) ? previous.filter((id) => id !== hazardId) : [...previous, hazardId]
    );
  }

  async function handleUseCcpSuggestion(hazard, suggestion) {
    setApplyingId(hazard.id);
    setError('');
    try {
      const updatedHazard = hazard.is_significant
        ? hazard
        : (
            await api.patch(`/haccp/hazards/${hazard.id}`, {
              is_significant: true,
              justification: suggestion.justification,
            })
          ).data;
      onOpenCcpEditor(updatedHazard, suggestion);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de confirmer le danger comme significatif.");
    } finally {
      setApplyingId('');
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-purple-200 bg-purple-50/50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles size={17} className="text-purple-600" />
            Assistance IA — surveillances proposées
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            À partir des dangers analysés, l’IA évalue leur significativité et propose les contrôles, fréquences et limites de surveillance adaptés.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={hazards.length === 0 || generating || !canManage}
          className="flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-md border border-purple-300 bg-white px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyse en cours...
            </>
          ) : suggestions ? (
            <>
              <RefreshCw size={16} />
              Réanalyser
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Analyser et proposer
            </>
          )}
        </button>
      </div>

      {hazards.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Ajoutez et enregistrez d’abord les dangers dans l’onglet Analyse.</p>
      )}
      {!canManage && <p className="mt-3 text-xs text-slate-500">La génération et l’application des propositions sont réservées aux responsables HACCP.</p>}
      {error && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700">{error}</p>}

      {suggestions && (
        <div className="mt-4 space-y-3">
          {summary && <p className="rounded-lg border border-purple-100 bg-white p-3 text-sm text-slate-700">{summary}</p>}
          {suggestions.map((suggestion) => {
            const hazard = hazards.find((item) => item.id === suggestion.hazard_id);
            if (!hazard) return null;

            const alreadyHasCcp = Boolean(hazard.ccp);
            const needsConfirmation = suggestion.is_significant && !hazard.is_significant;
            const confirmed = confirmedIds.includes(hazard.id);

            return (
              <article key={hazard.id} className="rounded-lg border border-purple-100 bg-white p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{hazard.stepName}</h3>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-medium text-slate-600">{HAZARD_TYPE_LABELS[hazard.hazard_type] || hazard.hazard_type}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      suggestion.is_significant ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {suggestion.is_significant ? 'CCP à prévoir' : 'Maîtrise hors CCP'}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">{hazard.description}</p>
                <p className="mt-2 text-sm text-slate-600">{suggestion.justification}</p>

                {suggestion.is_significant ? (
                  <div className="mt-3 space-y-2 rounded-md bg-purple-50/70 p-3 text-sm text-slate-700">
                    <p><strong>Limites critiques proposées :</strong> {suggestion.critical_limits}</p>
                    <p><strong>Surveillance :</strong> {suggestion.monitoring_procedure}</p>
                    <p><strong>Fréquence :</strong> {suggestion.monitoring_frequency}</p>
                    <p><strong>Action corrective :</strong> {suggestion.corrective_action_procedure}</p>
                    <p><strong>Vérification :</strong> {suggestion.verification_procedure} — {suggestion.verification_frequency}</p>
                    <p><strong>Enregistrement :</strong> {suggestion.record_keeping_procedure}</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                    <p><strong>Contrôle courant suggéré :</strong> {suggestion.routine_monitoring}</p>
                    <p className="mt-1"><strong>Fréquence :</strong> {suggestion.routine_frequency}</p>
                    <p className="mt-2 text-xs text-slate-500">À intégrer aux bonnes pratiques ou mesures de maîtrise existantes, sans créer de CCP.</p>
                    {alreadyHasCcp && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        Un CCP existe déjà pour ce danger. Cette suggestion ne le supprime pas : faites vérifier la décision par l’équipe HACCP.
                      </p>
                    )}
                  </div>
                )}

                {suggestion.is_significant && canManage && (
                  <div className="mt-3">
                    {needsConfirmation && (
                      <label className="mb-3 flex cursor-pointer items-start gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          onChange={() => toggleConfirmation(hazard.id)}
                          disabled={applyingId === hazard.id}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        Je confirme que ce danger est significatif et doit être traité comme un CCP.
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => handleUseCcpSuggestion(hazard, suggestion)}
                      disabled={(needsConfirmation && !confirmed) || applyingId === hazard.id}
                      className="flex min-h-[40px] items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {applyingId === hazard.id ? <Loader2 size={16} className="animate-spin" /> : alreadyHasCcp ? <RefreshCw size={16} /> : <Check size={16} />}
                      {alreadyHasCcp ? 'Préremplir la mise à jour du CCP' : 'Préremplir le CCP avec ces propositions'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Suggestions IA à valider par l’équipe HACCP. Les champs sont préremplis mais rien n’est enregistré avant validation du formulaire CCP.
          </p>
        </div>
      )}
    </section>
  );
}
