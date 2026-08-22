// Champ "Visibilité" partagé par tous les formulaires de création/édition qui supportent les
// catégories de module : soit "Tout le monde" (comportement par défaut, avec un choix optionnel
// de catégorie existante), soit "Uniquement moi" (catégorie personnelle en libre-service, voir
// lib/personalCategory.js) — les deux sont mutuellement exclusifs, d'où le remplacement du
// sélecteur de catégorie par les deux boutons plutôt que de les afficher côte à côte.
export default function CategoryVisibilityField({
  categories,
  categoryId,
  onCategoryIdChange,
  isPrivate,
  onIsPrivateChange,
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Visibilité</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onIsPrivateChange(false)}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            !isPrivate ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tout le monde
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onIsPrivateChange(true)}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            isPrivate ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Uniquement moi
        </button>
      </div>

      {!isPrivate && categories.length > 0 && (
        <select
          value={categoryId}
          onChange={(e) => onCategoryIdChange(e.target.value)}
          disabled={disabled}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
        >
          <option value="">Aucune catégorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
