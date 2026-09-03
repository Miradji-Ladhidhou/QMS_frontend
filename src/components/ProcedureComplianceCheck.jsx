import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../lib/api.js';

const SEVERITY_STYLES = {
  minor: { icon: AlertTriangle, className: 'text-amber-600' },
  major: { icon: AlertTriangle, className: 'text-orange-600' },
  blocking: { icon: XCircle, className: 'text-red-600' },
};

const SEVERITY_LABELS = { minor: 'Mineur', major: 'Majeur', blocking: 'Bloquant' };

// Vérification IA avant soumission — ne persiste rien (voir POST
// /:id/versions/:versionId/check-compliance), une simple aide pour l'auteur.
export default function ProcedureComplianceCheck({ procedureId, versionId }) {
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
            <ul className="space-y-2">
              {(result.anomalies || []).map((anomaly, i) => {
                const style = SEVERITY_STYLES[anomaly.severity] || SEVERITY_STYLES.minor;
                const Icon = style.icon;
                return (
                  <li key={i} className={`flex items-start gap-2 text-sm ${style.className}`}>
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{SEVERITY_LABELS[anomaly.severity] || anomaly.severity}</span>
                      {' — '}
                      {anomaly.issue}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
