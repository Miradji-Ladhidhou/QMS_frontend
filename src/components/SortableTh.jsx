import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

// En-tête de colonne cliquable pour les tableaux desktop — 3è clic ré-affiche l'icône neutre
// via useSort.toggleSort (asc -> desc -> ré-appui sur une autre colonne repart à asc).
export default function SortableTh({ label, sortKey, activeKey, direction, onSort, className, align = 'left' }) {
  const isActive = sortKey === activeKey;
  const Icon = isActive ? (direction === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th className={className ?? 'px-4 py-3'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 whitespace-nowrap ${align === 'right' ? 'ml-auto' : ''} ${
          isActive ? 'text-slate-700' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {label}
        <Icon size={13} className={isActive ? 'text-primary' : 'text-slate-300'} />
      </button>
    </th>
  );
}
