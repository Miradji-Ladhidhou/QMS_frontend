import { RISK_LEVEL_LABELS, RISK_LEVEL_STYLES, riskLevel } from '../lib/riskStatus.js';

export default function RiskScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">—</span>;
  }

  const level = riskLevel(score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[level]}`}>
      {score} · {RISK_LEVEL_LABELS[level]}
    </span>
  );
}
