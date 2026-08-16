import { AlertTriangle } from 'lucide-react';
import { CAPA_STATUS_LABELS, CAPA_STATUS_STYLES } from '../lib/capaStatus.js';

export default function CapaStatusBadge({ status }) {
  const isOverdue = status === 'overdue';

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        CAPA_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      } ${isOverdue ? 'ring-1 ring-red-400' : ''}`}
    >
      {isOverdue && <AlertTriangle size={12} />}
      {CAPA_STATUS_LABELS[status] ?? status}
    </span>
  );
}
