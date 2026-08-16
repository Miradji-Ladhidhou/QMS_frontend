import { CAPA_PRIORITY_LABELS, CAPA_PRIORITY_STYLES } from '../lib/capaStatus.js';

export default function CapaPriorityBadge({ priority }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        CAPA_PRIORITY_STYLES[priority] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {CAPA_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}
