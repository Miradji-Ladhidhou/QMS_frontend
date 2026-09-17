import { createContext, useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

export const UsersContext = createContext([]);

// Un seul GET /users par session, partagé par une vingtaine de pages qui en ont besoin
// uniquement pour un menu déroulant "assigné à" (jamais pour l'éditer — voir UserManager.jsx,
// qui garde son propre fetch local car c'est lui la véritable surface de gestion : inviter/
// changer un rôle/désactiver/supprimer). Même correctif que CurrentUserProvider.jsx/
// TenantProvider.jsx pour la même raison (chaque page refaisait sinon ce même GET /users à
// chaque montage, donc à chaque navigation). `refetch` est exposé pour permettre à
// UserManager.jsx de invalider ce cache partagé après une mutation (voir l'événement
// 'users-updated', même mécanique que 'tenant-updated' dans TenantProvider.jsx) — sinon un
// utilisateur qui vient d'être invité resterait absent des menus déroulants des autres pages
// déjà ouvertes tant que la session ne recharge pas entièrement.
export function UsersProvider({ children }) {
  const [users, setUsers] = useState([]);

  const load = useCallback(() => {
    api
      .get('/users')
      .then(({ data }) => setUsers(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('users-updated', load);
    return () => window.removeEventListener('users-updated', load);
  }, [load]);

  return <UsersContext.Provider value={users}>{children}</UsersContext.Provider>;
}
