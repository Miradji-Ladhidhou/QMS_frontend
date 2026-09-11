import { useEffect, useState } from 'react';
import { api } from './api.js';

// État + chargement de la navigation dans une arborescence de dossiers imbriqués — généralisé
// depuis Kpis.jsx (seul module à avoir eu des dossiers imbriqués jusqu'ici) pour servir tous
// les modules désormais concernés : `baseUrl` = '/module-categories' (générique, avec
// `resourceType`) ou '/categories' (Documents, sans resourceType). Ne gère QUE la navigation
// dans l'arbre (dossiers + fil d'Ariane) — le chargement des ÉLÉMENTS d'un dossier reste à la
// charge de chaque page appelante (filtres/tri propres à chaque module), en lui passant
// `currentFolderId` comme paramètre de sa propre requête.
export function useFolderNavigation({ baseUrl, resourceType }) {
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = racine
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

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
    navigateToFolder: setCurrentFolderId,
    breadcrumb,
    folders,
    foldersLoading,
    reloadFolders: () => loadFolders(currentFolderId),
  };
}
