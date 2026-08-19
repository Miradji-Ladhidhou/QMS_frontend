import { FINDING_TYPE_LABELS, FINDING_TYPE_STYLES } from '../lib/auditStatus.js';

export default function FindingTypeBadge({ type }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        FINDING_TYPE_STYLES[type] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {FINDING_TYPE_LABELS[type] ?? type}
    </span>
  );
}
