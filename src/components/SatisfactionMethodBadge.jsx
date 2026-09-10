import { SATISFACTION_METHOD_LABELS, SATISFACTION_METHOD_STYLES } from '../lib/customerSatisfactionStatus.js';

export default function SatisfactionMethodBadge({ method }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        SATISFACTION_METHOD_STYLES[method] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {SATISFACTION_METHOD_LABELS[method] ?? method}
    </span>
  );
}
