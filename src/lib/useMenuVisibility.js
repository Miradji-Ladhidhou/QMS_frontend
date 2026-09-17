import { useContext } from 'react';
import { MenuVisibilityContext } from './MenuVisibilityProvider.jsx';

// Sections de menu visibles pour l'utilisateur courant (déjà calculées côté backend — voir
// GET /api/tenant/menu, routes/tenant.js) : jamais la config brute (role_hidden_items /
// user_overrides), réservée à l'admin via useMenuSettings. null tant que non chargé — Layout.jsx
// garde le menu complet affiché pendant ce court instant plutôt que de tout masquer en attendant.
// Lit le contexte partagé (voir MenuVisibilityProvider.jsx, monté une seule fois dans App.jsx)
// plutôt que de refaire son propre GET /tenant/menu à chaque montage.
export function useMenuVisibility() {
  return useContext(MenuVisibilityContext);
}
