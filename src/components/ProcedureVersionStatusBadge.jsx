// Même forme qu'ApprovalStatusBadge.jsx, pour procedure_versions.status
// (draft/pending/approved/rejected) — 4 valeurs, ApprovalStatusBadge n'en couvre que 3
// (decision : pending/approved/rejected) et son prop s'appelle "decision", pas "status".
const LABELS = {
  draft: 'Brouillon',
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

const STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ProcedureVersionStatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
