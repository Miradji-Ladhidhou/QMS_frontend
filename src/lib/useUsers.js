import { useContext, useEffect } from 'react';
import { UsersContext } from './UsersProvider.jsx';

// Liste des utilisateurs du tenant courant — voir GET /api/users. [] tant que non chargée.
// Lit le contexte partagé (voir UsersProvider.jsx, monté une seule fois dans App.jsx) plutôt
// que de refaire son propre GET /users à chaque montage. Pour éditer la liste (inviter,
// changer un rôle, désactiver, supprimer), voir UserManager.jsx — pas ce hook, en lecture
// seule.
export function useUsers() {
  const context = useContext(UsersContext);
  useEffect(() => {
    context?.load();
  }, [context]);
  return context?.users || [];
}
