import { createContext, useEffect, useState } from 'react';
import { api } from './api.js';

export const TenantContext = createContext(null);

// Chargement partagé entre pages, avec rafraîchissement des accès modifiés par le super-admin.
export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    let active = true;
    function refresh() {
      api
        .get('/tenant')
        .then(({ data }) => { if (active) setTenant(data); })
        .catch((err) => console.error('Impossible de recharger les informations entreprise :', err.response?.status || err.message));
    }
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener('tenant-refresh', refresh);

    // CompanySettings.jsx émet cet événement après un PATCH /tenant réussi — avec un seul
    // Provider partagé, ce n'est plus nécessaire pour synchroniser plusieurs instances du hook
    // entre elles (il n'y en a plus qu'une), mais reste le chemin le plus simple pour que ce
    // composant, déjà découplé du Provider, puisse pousser la mise à jour sans prop drilling.
    function onTenantUpdated(event) {
      setTenant((previous) => ({ ...previous, ...event.detail }));
    }
    window.addEventListener('tenant-updated', onTenantUpdated);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('tenant-refresh', refresh);
      window.removeEventListener('tenant-updated', onTenantUpdated);
    };
  }, []);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}
