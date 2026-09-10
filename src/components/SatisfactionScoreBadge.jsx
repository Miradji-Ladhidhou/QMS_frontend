import { SATISFACTION_SCORE_STYLES } from '../lib/customerSatisfactionStatus.js';

export default function SatisfactionScoreBadge({ score }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
        SATISFACTION_SCORE_STYLES[score] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {score}/5
    </span>
  );
}
