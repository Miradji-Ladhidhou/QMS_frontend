import { ORDER_REVIEW_STATUS_LABELS, ORDER_REVIEW_STATUS_STYLES } from '../lib/orderReviewStatus.js';

export default function OrderReviewStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        ORDER_REVIEW_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {ORDER_REVIEW_STATUS_LABELS[status] ?? status}
    </span>
  );
}
