// 5 raccourcis neutres multi-tenant (mêmes teintes que la migration des anciens presets, voir
// backend/scripts/migrate-procedure-template-presets-to-custom.mjs) + une valeur libre — aucune
// couleur "de marque" imposée par l'app, contrairement à l'ancien système à 4 presets figés.
const SWATCHES = ['#44546A', '#1F5C5C', '#7A2E3B', '#2E5D42', '#3A3A3A'];

export default function ProcedureAccentColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Couleur d'accent personnalisée"
        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-slate-300 p-0.5"
      />
      {SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          onClick={() => onChange(swatch)}
          aria-label={`Couleur ${swatch}`}
          title={swatch}
          className={`h-7 w-7 shrink-0 rounded-full border-2 ${
            value?.toLowerCase() === swatch.toLowerCase() ? 'border-slate-900' : 'border-transparent'
          }`}
          style={{ backgroundColor: swatch }}
        />
      ))}
      <span className="text-xs uppercase tracking-wide text-slate-400">{value}</span>
    </div>
  );
}
