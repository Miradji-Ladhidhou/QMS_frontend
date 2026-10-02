import { ChevronFirst, ChevronLast } from 'lucide-react';

// Les options de comptage sont facultatives pour préserver les usages compacts existants.
export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize = 25, onPageSizeChange }) {
  if (totalPages <= 1 && totalItems === undefined) return null;

  const firstItem = totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastItem = totalItems ? Math.min(page * pageSize, totalItems) : 0;
  const firstVisiblePage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const visiblePages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstVisiblePage + index);
  const hasDetails = totalItems !== undefined;

  return (
    <div className="mt-3 flex flex-col gap-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {totalItems !== undefined && <span>{firstItem}–{lastItem} sur {totalItems} documents</span>}
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            Par page
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
            >
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        )}
      </div>
      <nav aria-label={hasDetails ? 'Pagination des documents' : 'Pagination'} className="flex items-center gap-1">
        {hasDetails && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="Première page"
            className="hidden rounded-md border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 sm:inline-flex"
          >
            <ChevronFirst size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Précédent
        </button>
        <span className={hasDetails ? 'px-2 text-xs text-slate-500 sm:hidden' : 'px-2 text-xs text-slate-500'}>
          Page {page} sur {totalPages}
        </span>
        {hasDetails && visiblePages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? 'page' : undefined}
            aria-label={`Page ${pageNumber}`}
            className={`hidden min-w-8 rounded-md border px-2 py-1.5 font-medium sm:inline-flex sm:items-center sm:justify-center ${
              pageNumber === page ? 'border-primary bg-primary text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Suivant
        </button>
        {hasDetails && (
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Dernière page"
            className="hidden rounded-md border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 sm:inline-flex"
          >
            <ChevronLast size={16} />
          </button>
        )}
      </nav>
    </div>
  );
}
