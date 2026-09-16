import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';

const SEVERITY_STYLES = {
  minor: { icon: AlertTriangle, className: 'text-amber-600' },
  major: { icon: AlertTriangle, className: 'text-orange-600' },
  blocking: { icon: XCircle, className: 'text-red-600' },
};

const SEVERITY_LABELS = { minor: 'Mineur', major: 'Majeur', blocking: 'Bloquant' };

// Une anomalie à la fois : sa suggestion de correction (générée à la demande, pas
// automatiquement avec le reste de la vérification — inutile de payer un appel Groq pour
// chaque anomalie si l'auteur ne compte en corriger qu'une seule) et son état de chargement.
function AnomalyItem({ procedureId, versionId, anomaly, onApplyCorrection }) {
  const style = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.minor;
  const Icon = style.icon;
  const [correction, setCorrection] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerateFix() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/procedures/${procedureId}/versions/${versionId}/compliance-fix`, {
        section_key: anomaly.section_key,
        issue: anomaly.issue,
        severity: anomaly.severity,
      });
      setCorrection(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer une correction.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <li className="text-sm">
      <div className={`flex items-start gap-2 ${style.className}`}>
        <Icon size={16} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-medium">{SEVERITY_LABELS[anomaly.severity] || anomaly.severity}</span>
          {' — '}
          {anomaly.issue}
        </span>
      </div>

      {onApplyCorrection && (
        <div className="mt-1.5 pl-6">
          {!correction && (
            <button
              type="button"
              onClick={handleGenerateFix}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-800 disabled:opacity-50"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {generating ? 'Génération en cours...' : 'Générer une correction avec l\'IA'}
            </button>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          {correction && (
            <div className="mt-1 rounded-lg border border-purple-200 bg-white p-2.5">
              <p className="whitespace-pre-wrap text-xs text-slate-700">{correction.corrected_content}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onApplyCorrection(anomaly.section_key, correction.corrected_content)}
                  className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700"
                >
                  Appliquer à la section
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFix}
                  disabled={generating}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Régénérer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// Vérification IA avant soumission — ne persiste rien (voir POST
// /:id/versions/:versionId/check-compliance), une simple aide pour l'auteur.
//
// onApplyCorrection(sectionKey, correctedContent) optionnel : quand fourni (monté dans
// EditVersionModal, qui a accès à content/setContent — voir ProcedureDetail.jsx), chaque
// anomalie peut générer une correction ciblée pour SA section et l'appliquer d'un clic. Absent
// dans la vue lecture seule du brouillon (avant d'ouvrir l'éditeur) : la vérification y reste
// juste informative, cohérent avec ce qui existait déjà à cet endroit.
export default function ProcedureComplianceCheck({ procedureId, versionId, onApplyCorrection }) {
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  async function handleCheck() {
    setError('');
    setChecking(true);
    try {
      const { data } = await api.post(`/procedures/${procedureId}/versions/${versionId}/check-compliance`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de vérifier la conformité.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheck}
        disabled={checking}
        className="flex items-center gap-2 rounded-md border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-50"
      >
        {checking ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Vérification en cours...
          </>
        ) : (
          <>
            <ShieldCheck size={16} />
            Vérifier la conformité
          </>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-4">
          {result.compliant ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={16} />
              Conforme au gabarit — aucune anomalie détectée.
            </p>
          ) : (
            <ul className="space-y-3">
              {(result.anomalies || []).map((anomaly, i) => (
                <AnomalyItem
                  key={i}
                  procedureId={procedureId}
                  versionId={versionId}
                  anomaly={anomaly}
                  onApplyCorrection={onApplyCorrection}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
