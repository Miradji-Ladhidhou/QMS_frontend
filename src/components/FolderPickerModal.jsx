import { useEffect, useState } from 'react';
import { Folder, X } from 'lucide-react';
import { api } from '../lib/api.js';
import FolderBreadcrumb from './FolderBreadcrumb.jsx';

// Sélecteur de dossier de destination, navigable dans une arborescence imbriquée — extrait de
// MoveKpiModal (Kpis.jsx, seul module à avoir eu des dossiers imbriqués jusqu'ici). Remplace
// les <select> plats (CategoryVisibilityField.jsx, BulkMoveCategoryModal.jsx, sélecteurs de
// dossier en ligne sur chaque fiche) : un menu déroulant plat ne fonctionne plus dès qu'un
// dossier peut être profond — impossible d'y retrouver un dossier vide ou d'exprimer "je veux
// descendre ici sans forcément choisir un sous-dossier nommé".
//
// Pur sélecteur : ne fait AUCUN appel de mutation lui-même (contrairement à MoveKpiModal, qui
// PATCHait directement) — chaque appelant a sa propre sémantique de sauvegarde (un champ de
// formulaire, un déplacement en masse, un déplacement d'un seul élément) ; ce composant
// appelle juste onSelect(folderId, folderName) — folderId peut être null (racine, "aucun
// dossier"), folderName vient du dernier maillon du fil d'Ariane (le dossier ouvert
// s'inclut lui-même, voir GET /:id/breadcrumb) — et laisse l'appelant décider quoi en faire.
export default function FolderPickerModal({
  baseUrl,
  resourceType,
  initialFolderId = null,
  title = 'Choisir un dossier',
  subtitle,
  confirmLabel = 'Choisir ce dossier',
  onClose,
  onSelect,
}) {
  const [pickerFolderId, setPickerFolderId] = useState(initialFolderId || null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingFolders(true);
    const listParams = { parent_id: pickerFolderId || 'root', ...(resourceType ? { resource_type: resourceType } : {}) };
    Promise.all([
      api.get(baseUrl, { params: listParams }),
      pickerFolderId ? api.get(`${baseUrl}/${pickerFolderId}/breadcrumb`) : Promise.resolve({ data: [] }),
    ])
      .then(([foldersRes, breadcrumbRes]) => {
        if (cancelled) return;
        setFolders(foldersRes.data);
        setBreadcrumb(breadcrumbRes.data);
      })
      .catch(() => {
        if (!cancelled) {
          setFolders([]);
          setBreadcrumb([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFolders(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickerFolderId, baseUrl, resourceType]);

  const alreadyHere = (initialFolderId || null) === (pickerFolderId || null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-xl bg-white p-5 sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={setPickerFolderId} rootLabel="Racine" />

        <div className="mt-3 flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-slate-100">
          {loadingFolders ? (
            <p className="py-6 text-center text-sm text-slate-400">Chargement...</p>
          ) : folders.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Aucun sous-dossier ici.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setPickerFolderId(folder.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Folder size={16} className="shrink-0 text-primary" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSelect(pickerFolderId, breadcrumb[breadcrumb.length - 1]?.name || '')}
            disabled={alreadyHere}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {alreadyHere ? 'Déjà ici' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
