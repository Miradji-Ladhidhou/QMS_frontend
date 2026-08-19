import { COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_STYLES } from '../lib/complaintStatus.js';

export default function ComplaintStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        COMPLAINT_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {COMPLAINT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
