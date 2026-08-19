import { RISK_STATUS_LABELS, RISK_STATUS_STYLES } from '../lib/riskStatus.js';

export default function RiskStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        RISK_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {RISK_STATUS_LABELS[status] ?? status}
    </span>
  );
}
