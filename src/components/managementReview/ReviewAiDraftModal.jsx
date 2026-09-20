import { useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import AutoTextarea from '../AutoTextarea.jsx';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

// Brouillon IA d'une revue : conclusions, opportunités d'amélioration et décisions, d'après les données d'entrée
// de la période et le suivi des actions précédentes. La direction relit, corrige et choisit ce qu'elle retient ;
// rien n'est enregistré avant « Appliquer ». Un texte existant n'est jamais écrasé : le brouillon s'ajoute à la suite.
export default function ReviewAiDraftModal({ reviewId, review, onClose, onApplied }) {
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/management-reviews/${reviewId}/ai-draft`);
      setDraft({
        conclusions: { keep: Boolean(data.conclusions), text: data.conclusions },
        improvement_opportunities: { keep: Boolean(data.improvement_opportunities), text: data.improvement_opportunities },
        decisions: data.decisions.map((text) => ({ keep: true, text })),
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer le brouillon.');
    } finally {
      setGenerating(false);
    }
  }

  const keptDecisions = (draft?.decisions || []).filter((decision) => decision.keep && decision.text.trim());
  const nothingKept = draft && !draft.conclusions.keep && !draft.improvement_opportunities.keep && keptDecisions.length === 0;

  // Ajoute le brouillon à la suite du texte déjà présent (séparé par une ligne vide), sans jamais l'écraser.
  const appendTo = (existing, addition) => [existing, addition.trim()].filter(Boolean).join('\n\n');

  async function apply() {
    setError('');
    setApplying(true);
    try {
      const patch = {};
      if (draft.conclusions.keep && draft.conclusions.text.trim()) patch.conclusions = appendTo(review.conclusions, draft.conclusions.text);
      if (draft.improvement_opportunities.keep && draft.improvement_opportunities.text.trim()) {
        patch.improvement_opportunities = appendTo(review.improvement_opportunities, draft.improvement_opportunities.text);
      }
      let updated = null;
      if (Object.keys(patch).length > 0) ({ data: updated } = await api.patch(`/management-reviews/${reviewId}`, patch));
      const createdActions = [];
      for (const decision of keptDecisions) {
        const { data } = await api.post(`/management-reviews/${reviewId}/actions`, { description: decision.text.trim(), source: 'ai' });
        createdActions.push(data);
      }
      onApplied({ updated, createdActions });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'appliquer le brouillon.");
      setApplying(false);
    }
  }

  // Appelée comme une fonction (pas <Section />) : un composant défini dans le rendu serait recréé à chaque frappe
  // et ferait perdre le focus du champ.
  const renderSection = (field, title, hint) => (
    <div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={draft[field].keep}
          onChange={(e) => setDraft((prev) => ({ ...prev, [field]: { ...prev[field], keep: e.target.checked } }))}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
        />
        {title}
      </label>
      {hint && <p className="ml-6 text-xs text-slate-400">{hint}</p>}
      <AutoTextarea
        rows={4}
        value={draft[field].text}
        onChange={(e) => setDraft((prev) => ({ ...prev, [field]: { ...prev[field], text: e.target.value } }))}
        className={`${INPUT_CLASS} mt-1 ${draft[field].keep ? '' : 'opacity-50'}`}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-2xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Sparkles size={18} className="text-violet-600" />
              Brouillon IA de la revue
            </h2>
            <p className="text-sm text-slate-500">Conclusions, opportunités et décisions proposées d'après les données d'entrée de la revue.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="-m-2 shrink-0 p-2.5 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {draft === null ? (
          <div className="space-y-4">
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              L'IA s'appuie <strong>uniquement</strong> sur les chiffres de la période et sur l'état des actions de la revue précédente : elle n'invente
              rien. Vous relisez et corrigez avant d'appliquer ; un texte déjà saisi n'est jamais écrasé, le brouillon s'ajoute à la suite.
            </p>
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Génération en cours...' : 'Générer le brouillon'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {renderSection('conclusions', 'Conclusions et décisions', review.conclusions ? 'Ajouté à la suite du texte existant.' : null)}
            {renderSection('improvement_opportunities', "Opportunités d'amélioration", review.improvement_opportunities ? 'Ajouté à la suite du texte existant.' : null)}

            {draft.decisions.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Décisions proposées (deviennent des actions)</p>
                <ul className="space-y-2">
                  {draft.decisions.map((decision, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={decision.keep}
                        aria-label={`Garder la décision ${index + 1}`}
                        onChange={(e) => setDraft((prev) => ({ ...prev, decisions: prev.decisions.map((item, i) => (i === index ? { ...item, keep: e.target.checked } : item)) }))}
                        className="mt-3 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <AutoTextarea
                        rows={2}
                        value={decision.text}
                        onChange={(e) => setDraft((prev) => ({ ...prev, decisions: prev.decisions.map((item, i) => (i === index ? { ...item, text: e.target.value } : item)) }))}
                        className={`${INPUT_CLASS} ${decision.keep ? '' : 'opacity-50'}`}
                      />
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-slate-400">Vous fixerez ensuite le responsable et l'échéance de chaque action.</p>
              </div>
            )}

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={apply}
                disabled={applying || nothingKept}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                <Check size={16} />
                {applying ? 'Application...' : 'Appliquer à la revue'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setError('');
                }}
                disabled={applying}
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Regénérer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
