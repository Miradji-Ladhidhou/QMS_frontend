import { useContext } from 'react';
import { TenantContext } from './TenantProvider.jsx';

// { id, name, slug, plan, logo_url, timezone } — voir GET /api/tenant. null tant que non chargé.
// Lit le contexte partagé (voir TenantProvider.jsx, monté une seule fois dans App.jsx) plutôt
// que de refaire son propre GET /tenant à chaque montage.
export function useTenant() {
  return useContext(TenantContext);
}
