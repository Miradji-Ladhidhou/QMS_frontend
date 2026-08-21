import { useEffect, useState } from 'react';
import { api } from './api.js';

// { id, name, slug, plan, logo_url, timezone } — voir GET /api/tenant. null tant que non chargé.
export function useTenant() {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    api
      .get('/tenant')
      .then(({ data }) => setTenant(data))
      .catch(() => {});

    // CompanySettings.jsx émet cet événement après un PATCH /tenant réussi : sans lui, les
    // autres instances de ce hook (l'horloge du menu, par ex.) garderaient l'ancien tenant
    // jusqu'au prochain montage puisque rien ne les relie entre elles autrement.
    function onTenantUpdated(event) {
      setTenant(event.detail);
    }
    window.addEventListener('tenant-updated', onTenantUpdated);
    return () => window.removeEventListener('tenant-updated', onTenantUpdated);
  }, []);

  return tenant;
}
