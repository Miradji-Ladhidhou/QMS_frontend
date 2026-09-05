import { ACCIDENT_STATUS_LABELS, ACCIDENT_STATUS_STYLES } from '../lib/accidentStatus.js';

export default function AccidentStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        ACCIDENT_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {ACCIDENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
