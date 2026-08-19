import { useEffect, useState } from 'react';
import { api } from './api.js';

const RETRY_DELAYS_MS = [1000, 3000, 8000];

// { id, full_name, role, tenant_id } — voir GET /api/users/me. null tant que non chargé.
// Beaucoup de pages (dont SuperAdmin.jsx) gardent une section entière derrière
// `currentUser?.is_super_admin`/`isManagerRole(currentUser?.role)` : avant, un échec réseau
// transitoire de cet appel laissait currentUser à null indéfiniment (erreur avalée en
// silence), ce qui bloquait ces vérifications de rôle plutôt que de les faire échouer
// franchement — sans jamais rediriger un utilisateur non autorisé dont la vérification ne
// se déclenche jamais. Quelques tentatives avec un délai croissant suffisent à absorber un
// blip réseau sans changer le contrat du hook (toujours null tant que non résolu).
export function useCurrentUser() {
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

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return currentUser;
}
