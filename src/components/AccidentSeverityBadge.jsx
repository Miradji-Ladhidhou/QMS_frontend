import { ACCIDENT_SEVERITY_LABELS, ACCIDENT_SEVERITY_STYLES } from '../lib/accidentStatus.js';

export default function AccidentSeverityBadge({ severity }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        ACCIDENT_SEVERITY_STYLES[severity] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {ACCIDENT_SEVERITY_LABELS[severity] ?? severity}
    </span>
  );
}
