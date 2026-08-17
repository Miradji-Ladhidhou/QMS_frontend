import { QQOQCCP_STATUS_LABELS, QQOQCCP_STATUS_STYLES } from '../lib/qqoqccpStatus.js';

export default function QqoqccpStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        QQOQCCP_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {QQOQCCP_STATUS_LABELS[status] ?? status}
    </span>
  );
}
