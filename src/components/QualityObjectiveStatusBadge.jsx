import { QUALITY_OBJECTIVE_STATUS_LABELS, QUALITY_OBJECTIVE_STATUS_STYLES } from '../lib/qualityObjectiveStatus.js';

export default function QualityObjectiveStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        QUALITY_OBJECTIVE_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {QUALITY_OBJECTIVE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
