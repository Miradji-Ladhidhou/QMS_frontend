import { useState } from 'react';
import { Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { RISK_TYPE_LABELS } from '../lib/riskStatus.js';

// Suggestions IA de risques/opportunités pour un service (voir POST /risks/service-suggestion,
// backend/src/services/groq.js) — même mécanique que AiHazardSuggestion.jsx (HACCP) : cases à
// cocher, un seul bouton "Enregistrer" qui envoie les suggestions cochées d'un coup, chacune
// devenant une ligne risks distincte (POST /risks, ai_generated: true).
export default function AiRiskSuggestion({ serviceId, serviceName, context, onAdded }) {
  const [risks, setRisks] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [checkedIndexes, setCheckedIndexes] = useState([]);
  const [addedIndexes, setAddedIndexes] = useState([]);
  const [saving, setSaving] = useState(false);

  const canGenerate = serviceName && context && context.trim().length >= 10;

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post('/risks/service-suggestion', { service_name: serviceName, context });
      setRisks(data.risks || []);
      setCheckedIndexes([]);
      setAddedIndexes([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer des suggestions IA.');
    } finally {
      setGenerating(false);
    }
  }

  function toggleChecked(index) {
    setCheckedIndexes((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  }

  async function handleSaveSelected() {
    setSaving(true);
    setError('');

    const newlyAdded = [];
    let lastError = '';
    // Séquentiel plutôt que Promise.all : en cas d'échec partiel, seuls les envois vraiment
    // réussis passent dans addedIndexes — un Promise.all échouerait tout ou rien à interpréter.
    for (const index of checkedIndexes) {
      const risk = risks[index];
      try {
        await api.post('/risks', {
          title: risk.title,
          type: risk.type,
          category: risk.category || undefined,
          service_id: serviceId || undefined,
          likelihood: risk.likelihood,
          impact: risk.impact,
          current_controls: risk.suggested_controls || undefined,
          ai_generated: true,
        });
        newlyAdded.push(index);
      } catch (err) {
        lastError = err.response?.data?.error || "Impossible d'ajouter certains risques.";
      }
    }

    if (newlyAdded.length > 0) {
      setAddedIndexes((prev) => [...prev, ...newlyAdded]);
      setCheckedIndexes((prev) => prev.filter((i) => !newlyAdded.includes(i)));
      onAdded();
    }
    if (lastError) setError(lastError);
    setSaving(false);
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
        ) : risks ? (
          <>
            <RefreshCw size={16} />
            Régénérer
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Suggérer des risques avec l'IA
          </>
        )}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {risks && risks.length > 0 && (
        <>
          <ul className="mt-3 space-y-2">
            {risks.map((risk, index) => {
              const added = addedIndexes.includes(index);
              return (
                <li
                  key={index}
                  className={`flex items-start gap-3 rounded-md border p-3 ${added ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={checkedIndexes.includes(index)}
                    onChange={() => toggleChecked(index)}
                    disabled={added || saving}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {RISK_TYPE_LABELS[risk.type] || risk.type}
                      {risk.category ? ` · ${risk.category}` : ''} · P{risk.likelihood} G{risk.impact}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-800">{risk.title}</p>
                    {risk.suggested_controls && (
                      <p className="mt-1 text-xs text-slate-500">Mesures de maîtrise suggérées : {risk.suggested_controls}</p>
                    )}
                  </div>
                  {added && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check size={14} />
                      Ajouté
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={handleSaveSelected}
            disabled={checkedIndexes.length === 0 || saving}
            className="mt-3 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Enregistrement...' : `Enregistrer${checkedIndexes.length > 0 ? ` (${checkedIndexes.length})` : ''}`}
          </button>
        </>
      )}
    </div>
  );
}
