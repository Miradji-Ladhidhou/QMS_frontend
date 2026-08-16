const LABELS = {
  approved: 'Approuvé',
  rejected: 'Rejeté',
  pending: 'En attente',
};

const STYLES = {
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-slate-100 text-slate-500',
};

export default function ApprovalStatusBadge({ decision }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[decision] ?? STYLES.pending}`}>
      {LABELS[decision] ?? decision}
    </span>
  );
}
