import { REVIEW_STATUS_LABELS, REVIEW_STATUS_STYLES } from '../lib/managementReviewStatus.js';

export default function ReviewStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        REVIEW_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {REVIEW_STATUS_LABELS[status] ?? status}
    </span>
  );
}
