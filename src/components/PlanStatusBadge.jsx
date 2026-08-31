import { PLAN_STATUS_LABELS, PLAN_STATUS_STYLES } from '../lib/haccpStatus.js';

export default function PlanStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        PLAN_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {PLAN_STATUS_LABELS[status] ?? status}
    </span>
  );
}
