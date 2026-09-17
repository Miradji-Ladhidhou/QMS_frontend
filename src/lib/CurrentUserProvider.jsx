import { createContext, useEffect, useState } from 'react';
import { api } from './api.js';

const RETRY_DELAYS_MS = [1000, 3000, 8000];

export const CurrentUserContext = createContext(null);

// Un seul GET /users/me par session, partagé par toute l'appli (Layout.jsx, useRole.js, et une
// quarantaine de pages qui vérifient un rôle) — avant, useCurrentUser() portait lui-même son
// useState+useEffect, donc CHAQUE composant qui l'appelait déclenchait son propre appel réseau
// indépendant : Layout.jsx + useRole() (qui rappelle useCurrentUser() en interne) + la page
// affichée refaisaient ce même GET à chaque navigation, causant le flash "chargement..." /
// saccade perceptible à chaque changement de page (bug réel constaté — voir aussi
// TenantProvider.jsx et MenuVisibilityProvider.jsx, même correctif pour /tenant et
// /tenant/menu). Le contrat de useCurrentUser() ne change pas (toujours `currentUser` ou
// `null`, voir useCurrentUser.js) : aucun des appelants existants n'a besoin d'être modifié.
export function CurrentUserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    function attempt(retriesLeft) {
      api
        .get('/users/me')
        .then(({ data }) => {
          if (!cancelled) setCurrentUser(data);
        })
        .catch(() => {
          if (cancelled || retriesLeft <= 0) return;
          const delay = RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - retriesLeft];
          timeoutId = setTimeout(() => attempt(retriesLeft - 1), delay);
        });
    }

    attempt(RETRY_DELAYS_MS.length);

    // ProfileSettings.jsx (Paramètres > Profil) émet cet événement après un PATCH /users/me
    // réussi (nom complet modifié) — sans lui, la sidebar (initiales/nom dans Layout.jsx) et
    // toute autre page affichant currentUser.full_name garderaient l'ancienne valeur jusqu'au
    // prochain rechargement complet. Fusion (comme l'ancien état local de Settings.jsx),
    // jamais un remplacement : PATCH /users/me ne renvoie pas nécessairement tous les champs.
    function onCurrentUserUpdated(event) {
      setCurrentUser((prev) => ({ ...prev, ...event.detail }));
    }
    window.addEventListener('current-user-updated', onCurrentUserUpdated);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener('current-user-updated', onCurrentUserUpdated);
    };
  }, []);

  return <CurrentUserContext.Provider value={currentUser}>{children}</CurrentUserContext.Provider>;
}
