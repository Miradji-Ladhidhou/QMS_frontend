import { Download, FolderInput, Loader2, Trash2, X } from 'lucide-react';

// Barre partagée par toutes les listes qui supportent des actions en masse. N'apparaît que si
// au moins un élément est coché. Chaque action (déplacer, exporter, supprimer) est optionnelle
// et n'est affichée que si la page appelante fournit le callback correspondant — une page qui
// ne passe que onMove/onClear garde exactement le comportement d'avant.
export default function BulkSelectionBar({ count, onMove, onExportCsv, onExportPdf, exportingPdf, onDelete, onClear }) {
  if (count === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
      <p className="text-sm font-medium text-primary">
        {count} sélectionné{count > 1 ? 's' : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onMove && (
          <button
            type="button"
            onClick={onMove}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <FolderInput size={16} />
            Déplacer vers...
          </button>
        )}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download size={16} />
            Exporter CSV
          </button>
        )}
        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exporter PDF
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          aria-label="Annuler la sélection"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
