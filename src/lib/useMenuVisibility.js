import { useEffect, useState } from 'react';
import { api } from './api.js';

// Sections de menu visibles pour l'utilisateur courant (déjà calculées côté backend — voir
// GET /api/tenant/menu, routes/tenant.js) : jamais la config brute (role_hidden_items /
// user_overrides), réservée à l'admin via useMenuSettings. null tant que non chargé — Layout.jsx
// garde le menu complet affiché pendant ce court instant plutôt que de tout masquer en attendant.
export function useMenuVisibility() {
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    api
      .get('/tenant/menu')
      .then(({ data }) => setVisible(data.visible))
      .catch(() => setVisible(null));
  }, []);

  return visible;
}
