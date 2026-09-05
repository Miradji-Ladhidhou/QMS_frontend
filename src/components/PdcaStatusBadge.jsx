import { PDCA_STATUS_LABELS, PDCA_STATUS_STYLES } from '../lib/pdcaStatus.js';

export default function PdcaStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        PDCA_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {PDCA_STATUS_LABELS[status] ?? status}
    </span>
  );
}
