import { FolderInput, X } from 'lucide-react';

// Barre partagée par toutes les listes qui supportent le déplacement en masse — n'apparaît que
// si au moins un élément est coché (voir BulkMoveCategoryModal pour la modale qu'elle ouvre).
export default function BulkSelectionBar({ count, onMove, onClear }) {
  if (count === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
      <p className="text-sm font-medium text-primary">
        {count} sélectionné{count > 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMove}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <FolderInput size={16} />
          Déplacer vers...
        </button>
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
