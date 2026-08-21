import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';

// Équivalent du tri par en-tête de colonne (SortableTh.jsx) pour les pages en cartes, qui
// n'ont pas de <thead> sur mobile ni desktop — un select "Trier par" + un bouton de sens.
export default function SortSelect({ options, sortKey, direction, onChangeKey, onToggleDirection }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={sortKey}
        onChange={(e) => onChangeKey(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            Trier par {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleDirection}
        aria-label={direction === 'asc' ? 'Tri croissant' : 'Tri décroissant'}
        title={direction === 'asc' ? 'Tri croissant' : 'Tri décroissant'}
        className="flex shrink-0 items-center justify-center rounded-md border border-slate-300 p-2.5 text-slate-600 hover:bg-slate-50"
      >
        {direction === 'asc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
      </button>
    </div>
  );
}
