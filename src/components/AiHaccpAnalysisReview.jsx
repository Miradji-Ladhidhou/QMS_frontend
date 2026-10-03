import { useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { HAZARD_TYPE_LABELS } from '../lib/haccpStatus.js';

const SEVERITY_STYLES = {
  high: 'border-red-200 bg-red-50 text-red-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
};

const SEVERITY_LABELS = { high: 'Prioritaire', medium: 'À vérifier', low: 'Piste' };

export default function AiHaccpAnalysisReview({ plan }) {
  const [review, setReview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const hasSteps = plan.steps.length > 0;

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/ai/haccp-plan-review', {
        planTitle: plan.title,
        productDescription: plan.product_description || '',
        scope: plan.scope || '',
        steps: plan.steps.map((step) => ({
          name: step.name,
          description: step.description || '',
          hazards: step.hazards.map((hazard) => ({
            hazard_type: hazard.hazard_type,
            description: hazard.description,
            existing_controls: hazard.existing_controls || '',
            likelihood: hazard.likelihood,
            severity: hazard.severity,
            is_significant: hazard.is_significant,
            justification: hazard.justification || '',
            ccp: hazard.ccp
              ? {
                  critical_limits: hazard.ccp.critical_limits || '',
                  monitoring_procedure: hazard.ccp.monitoring_procedure || '',
                }
              : null,
          })),
        })),
      });
      setReview(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'analyser les dangers avec l'IA.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-purple-200 bg-purple-50/50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles size={17} className="text-purple-600" />
            Assistance IA — analyse des dangers
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Repérez les points à vérifier dans les dangers, leur cotation et leur lien avec les CCP du plan.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!hasSteps || generating}
          className="flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-md border border-purple-300 bg-white px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyse en cours...
            </>
          ) : review ? (
            <>
              <RefreshCw size={16} />
              Réanalyser
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Analyser le plan
            </>
          )}
        </button>
      </div>

      {!hasSteps && <p className="mt-3 text-xs text-slate-500">Ajoutez d'abord les étapes du procédé dans l'onglet Analyse.</p>}
      {error && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700">{error}</p>}

      {review && (
        <div className="mt-4 space-y-3">
          <p className="rounded-lg border border-purple-100 bg-white p-3 text-sm text-slate-700">{review.summary}</p>
          {review.findings.length > 0 ? (
            <ul className="space-y-2">
              {review.findings.map((finding, index) => (
                <li key={`${finding.step_name}-${index}`} className={`rounded-lg border p-3 ${SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.low}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <AlertTriangle size={13} />
                      {SEVERITY_LABELS[finding.severity] || 'À vérifier'}
                    </span>
                    {finding.step_name && <span className="text-xs">· {finding.step_name}</span>}
                    {finding.hazard_type && <span className="text-xs">· {HAZARD_TYPE_LABELS[finding.hazard_type] || finding.hazard_type}</span>}
                  </div>
                  <p className="mt-1 text-sm font-medium">{finding.observation}</p>
                  <p className="mt-1 text-sm">{finding.recommendation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Aucun point de vigilance supplémentaire n'a été relevé dans cette suggestion.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Suggestions générées par IA, à vérifier par l'équipe HACCP. Elles ne remplacent pas une validation réglementaire et ne modifient pas le plan.
          </p>
        </div>
      )}
    </section>
  );
}
