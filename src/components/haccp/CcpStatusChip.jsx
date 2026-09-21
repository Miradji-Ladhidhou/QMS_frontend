import { AlertTriangle } from 'lucide-react';
import { MONITORING_STATE_LABELS, MONITORING_STATE_STYLES } from '../../lib/haccpMonitoring.js';

// État de surveillance d'un CCP : « relevé en retard », « à jour »… et, en plus, « dérives répétées » quand le
// CCP a enregistré plusieurs relevés hors limites cette semaine. `hideOk` masque « à jour » (rien à signaler).
export default function CcpStatusChip({ ccp, hideOk = false }) {
  const state = ccp.monitoring_state || 'no_schedule';
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {!(hideOk && (state === 'ok' || state === 'no_schedule')) && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MONITORING_STATE_STYLES[state]}`}>{MONITORING_STATE_LABELS[state]}</span>
      )}
      {ccp.repeated_deviation && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertTriangle size={11} />
          {ccp.recent_deviations} dérives en 7 j
        </span>
      )}
    </span>
  );
}
