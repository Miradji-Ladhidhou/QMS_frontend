// Motif "Précédent / Page X sur Y / Suivant" extrait de Kpis.jsx (RecordProofModal), qui
// dupliquait déjà ce bloc à la main — réutilisé tel quel ici, jamais réécrit.
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        Précédent
      </button>
      <span className="text-xs text-slate-500">
        Page {page} sur {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        Suivant
      </button>
    </div>
  );
}
