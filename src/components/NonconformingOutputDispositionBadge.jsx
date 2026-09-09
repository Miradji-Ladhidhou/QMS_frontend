import { NONCONFORMING_OUTPUT_DISPOSITION_LABELS, NONCONFORMING_OUTPUT_DISPOSITION_STYLES } from '../lib/nonconformingOutputStatus.js';

export default function NonconformingOutputDispositionBadge({ disposition }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        NONCONFORMING_OUTPUT_DISPOSITION_STYLES[disposition] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {NONCONFORMING_OUTPUT_DISPOSITION_LABELS[disposition] ?? disposition}
    </span>
  );
}
