import { useState } from 'react';
import { Folder } from 'lucide-react';
import FolderPickerModal from './FolderPickerModal.jsx';

// Champ "Visibilité" partagé par tous les formulaires de création/édition qui supportent les
// catégories de module : soit "Tout le monde" (comportement par défaut, avec un choix optionnel
// de catégorie existante), soit "Uniquement moi" (catégorie personnelle en libre-service, voir
// lib/personalCategory.js) — les deux sont mutuellement exclusifs, d'où le remplacement du
// sélecteur de catégorie par les deux boutons plutôt que de les afficher côte à côte.
//
// Deux modes pour le sélecteur de catégorie, le temps que tous les modules passent aux
// dossiers imbriqués (voir plan de migration — page par page, pas d'un coup) :
// - `categories` (tableau plat) : mode historique, un <select> plat. Toujours valable pour
//   les pages pas encore migrées.
// - `baseUrl`/`resourceType` (+ `categoryName` pour l'affichage) : mode dossiers imbriqués,
//   ouvre FolderPickerModal — un <select> plat ne permet plus de choisir un dossier profond.
// Exactement un des deux modes doit être fourni par l'appelant, jamais les deux.
export default function CategoryVisibilityField({
  categories,
  baseUrl,
  resourceType,
  categoryName,
  categoryId,
  onCategoryIdChange,
  onCategoryNameChange,
  isPrivate,
  onIsPrivateChange,
  disabled = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const nested = Boolean(baseUrl);

  function handleCategoryIdChange(value, name) {
    // En sortant de "Uniquement moi", categoryId contient encore l'id de la catégorie
    // personnelle (masquée, jamais affichée dans le sélecteur) : sans ce reset, un retour à
    // "Tout le monde" sans re-choisir de catégorie laisserait l'élément privé en silence
    // malgré le bouton affiché.
    onCategoryIdChange(value);
    onCategoryNameChange?.(name || '');
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Visibilité</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (isPrivate) handleCategoryIdChange('', '');
            onIsPrivateChange(false);
          }}
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

      {!isPrivate && nested && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-md border border-slate-300 px-3 py-2.5 text-left text-base text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-500"
          >
            <Folder size={16} className="shrink-0 text-primary" />
            <span className="truncate">{categoryName || 'Aucun dossier'}</span>
          </button>
          {pickerOpen && (
            <FolderPickerModal
              baseUrl={baseUrl}
              resourceType={resourceType}
              initialFolderId={categoryId || null}
              subtitle="Dossier de rattachement"
              onClose={() => setPickerOpen(false)}
              onSelect={(folderId, folderName) => {
                handleCategoryIdChange(folderId || '', folderName);
                setPickerOpen(false);
              }}
            />
          )}
        </>
      )}

      {!isPrivate && !nested && categories.length > 0 && (
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
