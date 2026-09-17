import { useContext } from 'react';
import { CurrentUserContext } from './CurrentUserProvider.jsx';

// { id, full_name, role, tenant_id } — voir GET /api/users/me. null tant que non chargé.
// Lit maintenant le contexte partagé (voir CurrentUserProvider.jsx, monté une seule fois dans
// App.jsx) plutôt que de refaire son propre GET /users/me à chaque montage : le fetch-avec-
// repli (délais croissants sur un blip réseau transitoire) vit désormais dans le Provider,
// une seule fois par session.
export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
