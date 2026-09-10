import { COMMUNICATION_SCOPE_LABELS, COMMUNICATION_SCOPE_STYLES } from '../lib/communicationPlanLabels.js';

export default function CommunicationScopeBadge({ scope }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        COMMUNICATION_SCOPE_STYLES[scope] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {COMMUNICATION_SCOPE_LABELS[scope] ?? scope}
    </span>
  );
}
