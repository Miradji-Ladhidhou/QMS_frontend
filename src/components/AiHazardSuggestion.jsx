import { useState } from 'react';
import { Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { HAZARD_TYPE_LABELS } from '../lib/haccpStatus.js';

// Suggestions IA pour l'analyse des dangers d'une étape (voir POST
// /haccp/steps/:stepId/hazard-suggestion, backend/src/services/groq.js). Contrairement à
// AiCapaSuggestion.jsx (une seule suggestion, préremplit un formulaire), l'utilisateur coche
// celles qu'il veut garder puis les enregistre toutes en un clic — chacune devient une ligne
// haccp_hazards distincte (POST /haccp/steps/:stepId/hazards, ai_generated: true).
export default function AiHazardSuggestion({ stepId, onAdded }) {
  const [hazards, setHazards] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [checkedIndexes, setCheckedIndexes] = useState([]);
  const [addedIndexes, setAddedIndexes] = useState([]);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/haccp/steps/${stepId}/hazard-suggestion`);
      setHazards(data.hazards || []);
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
      const hazard = hazards[index];
      try {
        await api.post(`/haccp/steps/${stepId}/hazards`, {
          hazard_type: hazard.hazard_type,
          description: hazard.description,
          existing_controls: hazard.suggested_controls || undefined,
          likelihood: hazard.likelihood,
          severity: hazard.severity,
          ai_generated: true,
        });
        newlyAdded.push(index);
      } catch (err) {
        lastError = err.response?.data?.error || "Impossible d'ajouter certains dangers.";
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
        <>
          <ul className="mt-3 space-y-2">
            {hazards.map((hazard, index) => {
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
                      {HAZARD_TYPE_LABELS[hazard.hazard_type] || hazard.hazard_type} · P{hazard.likelihood} G{hazard.severity}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-800">{hazard.description}</p>
                    {hazard.suggested_controls && (
                      <p className="mt-1 text-xs text-slate-500">Mesures de maîtrise suggérées : {hazard.suggested_controls}</p>
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
            {saving
              ? 'Enregistrement...'
              : `Enregistrer${checkedIndexes.length > 0 ? ` (${checkedIndexes.length})` : ''}`}
          </button>
        </>
      )}
    </div>
  );
}
