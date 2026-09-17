import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './api.js';

// État + chargement de la navigation dans une arborescence de dossiers imbriqués — généralisé
// depuis Kpis.jsx (seul module à avoir eu des dossiers imbriqués jusqu'ici) pour servir tous
// les modules désormais concernés : `baseUrl` = '/module-categories' (générique, avec
// `resourceType`) ou '/categories' (Documents, sans resourceType). Ne gère QUE la navigation
// dans l'arbre (dossiers + fil d'Ariane) — le chargement des ÉLÉMENTS d'un dossier reste à la
// charge de chaque page appelante (filtres/tri propres à chaque module), en lui passant
// `currentFolderId` comme paramètre de sa propre requête.
//
// currentFolderId vit dans l'URL (?folder=...), jamais dans un simple useState : sinon ouvrir
// des dossiers imbriqués ne crée aucune entrée d'historique, et le bouton retour du navigateur/
// téléphone saute par-dessus toute la navigation pour renvoyer à la toute première page visitée
// avant celle-ci (bug réel constaté — "retour" ramène direct à la page de départ au lieu du
// dossier précédent). Avec le dossier dans l'URL, chaque clic pousse une entrée d'historique
// et le retour natif remonte les dossiers un par un, exactement comme l'utilisateur l'attend —
// et ouvrir un élément DANS un dossier (ex. un document) puis faire retour ramène bien dans ce
// dossier précis, plutôt qu'à la racine du module.
export function useFolderNavigation({ baseUrl, resourceType }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folder') || null;
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  function navigateToFolder(folderId) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (folderId) {
        next.set('folder', folderId);
      } else {
        next.delete('folder');
      }
      return next;
    });
  }

  function listParams(folderId) {
    const params = { parent_id: folderId || 'root' };
    if (resourceType) params.resource_type = resourceType;
    return { params };
  }

  async function loadFolders(folderId) {
    setFoldersLoading(true);
    try {
      const { data } = await api.get(baseUrl, listParams(folderId));
      setFolders(data);
    } catch {
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  }

  async function loadBreadcrumb(folderId) {
    if (!folderId) {
      setBreadcrumb([]);
      return;
    }
    try {
      const { data } = await api.get(`${baseUrl}/${folderId}/breadcrumb`);
      setBreadcrumb(data);
    } catch {
      setBreadcrumb([]);
    }
  }

  useEffect(() => {
    loadFolders(currentFolderId);
    loadBreadcrumb(currentFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, baseUrl, resourceType]);

  return {
    currentFolderId,
    navigateToFolder,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders: () => loadFolders(currentFolderId),
  };
}
