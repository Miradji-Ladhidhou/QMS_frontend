import { AUDIT_STATUS_LABELS, AUDIT_STATUS_STYLES } from '../lib/auditStatus.js';

export default function AuditStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        AUDIT_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {AUDIT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
