import { CAPA_SEVERITY_LABELS, CAPA_SEVERITY_STYLES } from '../lib/capaStatus.js';

export default function CapaSeverityBadge({ severity }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        CAPA_SEVERITY_STYLES[severity] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {CAPA_SEVERITY_LABELS[severity] ?? severity}
    </span>
  );
}
