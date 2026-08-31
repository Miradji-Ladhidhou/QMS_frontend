import { useState } from 'react';
import { Check, Loader2, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { HAZARD_TYPE_LABELS } from '../lib/haccpStatus.js';

// Suggestions IA pour l'analyse des dangers d'une étape (voir POST
// /haccp/steps/:stepId/hazard-suggestion, backend/src/services/groq.js). Contrairement à
// AiCapaSuggestion.jsx (une seule suggestion, préremplit un formulaire), chaque danger suggéré
// est ajouté indépendamment ici : l'utilisateur peut accepter plusieurs suggestions d'un même
// appel sans régénérer, chacune devenant immédiatement une ligne haccp_hazards distincte
// (POST /haccp/steps/:stepId/hazards, ai_generated: true).
export default function AiHazardSuggestion({ stepId, onAdded }) {
  const [hazards, setHazards] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [addedIndexes, setAddedIndexes] = useState([]);
  const [addingIndex, setAddingIndex] = useState(null);

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/haccp/steps/${stepId}/hazard-suggestion`);
      setHazards(data.hazards || []);
      setAddedIndexes([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer des suggestions IA.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAdd(hazard, index) {
    setAddingIndex(index);
    setError('');
    try {
      const { data } = await api.post(`/haccp/steps/${stepId}/hazards`, {
        hazard_type: hazard.hazard_type,
        description: hazard.description,
        existing_controls: hazard.suggested_controls || undefined,
        likelihood: hazard.likelihood,
        severity: hazard.severity,
        ai_generated: true,
      });
      setAddedIndexes((prev) => [...prev, index]);
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter ce danger.");
    } finally {
      setAddingIndex(null);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 rounded-md border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Génération en cours...
          </>
        ) : hazards ? (
          <>
            <RefreshCw size={16} />
            Régénérer
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Suggérer des dangers avec l'IA
          </>
        )}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {hazards && hazards.length > 0 && (
        <ul className="mt-3 space-y-2">
          {hazards.map((hazard, index) => {
            const added = addedIndexes.includes(index);
            return (
              <li key={index} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {HAZARD_TYPE_LABELS[hazard.hazard_type] || hazard.hazard_type} · P{hazard.likelihood} G{hazard.severity}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-800">{hazard.description}</p>
                    {hazard.suggested_controls && (
                      <p className="mt-1 text-xs text-slate-500">Mesures de maîtrise suggérées : {hazard.suggested_controls}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(hazard, index)}
                    disabled={added || addingIndex === index}
                    className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      added
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'border border-primary text-primary hover:bg-primary/5 disabled:opacity-50'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check size={14} />
                        Ajouté
                      </>
                    ) : addingIndex === index ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={14} />
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
