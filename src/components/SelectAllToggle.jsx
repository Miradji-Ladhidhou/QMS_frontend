// Case à cocher "Tout sélectionner" partagée par toutes les listes qui supportent la sélection
// en masse — indépendante de BulkSelectionBar (qui n'apparaît elle qu'une fois au moins un
// élément coché) : celle-ci doit rester visible pour démarrer une sélection depuis zéro.
export default function SelectAllToggle({ ids, selectedIds, onChange }) {
  if (ids.length === 0) return null;

  const allSelected = ids.every((id) => selectedIds.includes(id));

  return (
    <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={allSelected}
        onChange={() => onChange(allSelected ? [] : ids)}
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
      />
      Tout sélectionner
    </label>
  );
}
