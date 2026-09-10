import { QMS_CHANGE_STATUS_LABELS, QMS_CHANGE_STATUS_STYLES } from '../lib/qmsChangeStatus.js';

export default function QmsChangeStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        QMS_CHANGE_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {QMS_CHANGE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
