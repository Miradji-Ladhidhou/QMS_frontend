import { createContext, useEffect, useState } from 'react';
import { api } from './api.js';

export const TenantContext = createContext(null);

// Un seul GET /tenant par session, partagé par toute l'appli (Layout.jsx + une vingtaine de
// pages) — même correctif que CurrentUserProvider.jsx, pour la même raison (chaque appel de
// useTenant() refaisait sinon son propre GET /tenant à chaque montage de page, donc à chaque
// navigation).
export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    api
      .get('/tenant')
      .then(({ data }) => setTenant(data))
      .catch(() => {});

    // CompanySettings.jsx émet cet événement après un PATCH /tenant réussi — avec un seul
    // Provider partagé, ce n'est plus nécessaire pour synchroniser plusieurs instances du hook
    // entre elles (il n'y en a plus qu'une), mais reste le chemin le plus simple pour que ce
    // composant, déjà découplé du Provider, puisse pousser la mise à jour sans prop drilling.
    function onTenantUpdated(event) {
      setTenant(event.detail);
    }
    window.addEventListener('tenant-updated', onTenantUpdated);
    return () => window.removeEventListener('tenant-updated', onTenantUpdated);
  }, []);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}
