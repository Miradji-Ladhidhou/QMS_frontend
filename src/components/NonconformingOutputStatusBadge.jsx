import { NONCONFORMING_OUTPUT_STATUS_LABELS, NONCONFORMING_OUTPUT_STATUS_STYLES } from '../lib/nonconformingOutputStatus.js';

export default function NonconformingOutputStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        NONCONFORMING_OUTPUT_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {NONCONFORMING_OUTPUT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
