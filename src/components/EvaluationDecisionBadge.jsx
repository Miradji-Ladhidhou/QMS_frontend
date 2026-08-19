import { EVALUATION_DECISION_LABELS, EVALUATION_DECISION_STYLES } from '../lib/supplierStatus.js';

export default function EvaluationDecisionBadge({ decision }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        EVALUATION_DECISION_STYLES[decision] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {EVALUATION_DECISION_LABELS[decision] ?? decision}
    </span>
  );
}
