import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { withAiModule } from '../lib/aiModules.jsx';
import { HAZARD_TYPE_LABELS, CONTROL_TYPE_LABELS } from '../lib/haccpStatus.js';
import { generateAi, useSavedAiResult } from '../lib/aiGenerations.js';

export default withAiModule('haccp', AiHaccpSurveillanceSuggestion);
function AiHaccpSurveillanceSuggestion({ plan, canManage, onOpenCcpEditor, onOpenHazardEditor, onSaved }) {
  const [suggestions, setSuggestions] = useState(null);
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState([]);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const hazards = plan.steps.flatMap((step) => step.hazards.map((hazard) => ({ ...hazard, stepName: step.name })));
  const analysisSignature = JSON.stringify({
    planId: plan.id,
    product: plan.product_description,
    scope: plan.scope,
    steps: plan.steps.map((step) => ({
      name: step.name,
      description: step.description,
      hazards: step.hazards.map(({ id, description, hazard_type, existing_controls, likelihood, severity }) => ({
        id, description, hazard_type, existing_controls, likelihood, severity,
      })),
    })),
  });

  useEffect(() => {
    setSuggestions(null);
    setSummary('');
    setSelectedIds([]);
    setSavedIds([]);
    setSaveMessage('');
  }, [analysisSignature]);

  const input = {
        planId: plan.id,
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
            control_type: hazard.control_type || 'undetermined',
            decision_justification: hazard.decision_justification || '',
            justification: hazard.justification || '',
            has_ccp: Boolean(hazard.ccp),
          })),
        })),
      };
  useSavedAiResult(canManage && hazards.length ? '/ai/haccp-surveillance-suggestion' : null, input, (data) => {
    setSuggestions(data?.suggestions || null);
    setSummary(data?.summary || '');
  }, setError);

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await generateAi('/ai/haccp-surveillance-suggestion', input, Boolean(suggestions));
      setSuggestions(data.suggestions || []);
      setSummary(data.summary || '');
      setSelectedIds([]);
      setSavedIds([]);
      setSaveMessage('');
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de générer les propositions de surveillance.");
    } finally {
      setGenerating(false);
    }
  }

  function toggleSelected(hazardId) {
    setSelectedIds((previous) =>
      previous.includes(hazardId) ? previous.filter((id) => id !== hazardId) : [...previous, hazardId]
    );
  }

  async function handleSaveSelected() {
    setSaving(true);
    setError('');
    setSaveMessage('');

    const selectedSuggestions = suggestions.filter((suggestion) =>
      selectedIds.includes(suggestion.hazard_id) && suggestion.control_type === 'ccp'
    );
    try {
      const { data } = await api.post(`/haccp/plans/${plan.id}/ccp-drafts`, {
        proposals: selectedSuggestions.map((suggestion) => ({
          hazard_id: suggestion.hazard_id,
          justification: suggestion.decision_justification || suggestion.justification,
          critical_limits: suggestion.critical_limits,
          monitoring_procedure: suggestion.monitoring_procedure,
          monitoring_frequency: suggestion.monitoring_frequency,
          corrective_action_procedure: suggestion.corrective_action_procedure,
          verification_procedure: suggestion.verification_procedure,
          verification_frequency: suggestion.verification_frequency,
          record_keeping_procedure: suggestion.record_keeping_procedure,
        })),
      });
      const newlySaved = data.created.map((ccp) => ccp.hazard_id);
      if (newlySaved.length) {
        setSavedIds((previous) => [...previous, ...newlySaved]);
        setSelectedIds((previous) => previous.filter((id) => !newlySaved.includes(id)));
        setSaveMessage(`${newlySaved.length} brouillon${newlySaved.length > 1 ? 's' : ''} CCP enregistré${newlySaved.length > 1 ? 's' : ''}. Complétez les preuves et approuvez chaque CCP avant surveillance.`);
        await onSaved();
      }
      if (data.errors?.length) {
        setError(data.errors.map((failure) => `${hazards.find((hazard) => hazard.id === failure.hazard_id)?.stepName || failure.hazard_id} : ${failure.error}`).join(' ; '));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer les brouillons CCP.");
    } finally {
      setSaving(false);
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
            L’IA distingue l’importance du danger de la décision de maîtrise : prérequis, CCP ou procédé à modifier. Sélectionnez des propositions pour préparer des brouillons, sans les mettre en service.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={hazards.length === 0 || generating || saving || !canManage}
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
        <p className="mt-3 text-xs text-slate-500">Ajoutez et enregistrez d’abord les dangers dans l’espace « Dangers ».</p>
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
            const saved = savedIds.includes(hazard.id);
            const selected = selectedIds.includes(hazard.id);

            return (
              <article key={hazard.id} className="rounded-lg border border-purple-100 bg-white p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{hazard.stepName}</h3>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-medium text-slate-600">{HAZARD_TYPE_LABELS[hazard.hazard_type] || hazard.hazard_type}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      suggestion.control_type === 'ccp' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {CONTROL_TYPE_LABELS[suggestion.control_type] || CONTROL_TYPE_LABELS.undetermined}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">{hazard.description}</p>
                <p className="mt-2 text-sm text-slate-600">{suggestion.justification}</p>
                <p className="mt-1 text-sm text-slate-600">{suggestion.decision_justification}</p>

                {suggestion.control_type === 'ccp' ? (
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
                    <p className="mt-2 text-xs text-slate-500">{suggestion.control_type === 'process_change' ? 'Adaptez le procédé et réévaluez le danger avant mise en service.' : 'Documentez cette décision dans l’analyse des dangers ; aucun CCP n’est créé automatiquement.'}</p>
                    {alreadyHasCcp && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        Un CCP existe déjà pour ce danger. Cette suggestion ne le supprime pas : faites vérifier la décision par l’équipe HACCP.
                      </p>
                    )}
                    {canManage && <button type="button" disabled={saving} onClick={() => onOpenHazardEditor(hazard, suggestion)} className="mt-2 min-h-[40px] rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700">Réviser la décision dans l’analyse</button>}
                  </div>
                )}

                {suggestion.control_type === 'ccp' && canManage && (
                  <div className="mt-3">
                    {saved ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                        <Check size={16} /> Brouillon CCP enregistré
                      </span>
                    ) : alreadyHasCcp ? (
                      <button
                        type="button"
                        onClick={() => onOpenCcpEditor(hazard, suggestion)}
                        disabled={saving}
                        className="flex min-h-[40px] items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <RefreshCw size={16} />
                        Préremplir la mise à jour du CCP
                      </button>
                    ) : (
                      <label className="flex min-h-[40px] cursor-pointer items-start gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelected(hazard.id)}
                          disabled={saving}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        Sélectionner ce brouillon CCP — je retiens cette décision pour révision
                      </label>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {selectedIds.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-purple-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-700">
                {selectedIds.length} CCP sélectionné{selectedIds.length > 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={handleSaveSelected}
                disabled={saving}
                className="flex min-h-[40px] items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Enregistrement...' : 'Créer les brouillons sélectionnés'}
              </button>
            </div>
          )}
          {saveMessage && <p role="status" className="text-sm font-medium text-emerald-700">{saveMessage}</p>}
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Une proposition IA n’est pas une preuve de validation. Les brouillons ne déclenchent ni surveillance ni rappel. Complétez les limites, leurs sources, les preuves, la fréquence et le responsable, puis approuvez chaque CCP.
          </p>
        </div>
      )}
    </section>
  );
}
