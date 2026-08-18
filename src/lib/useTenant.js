import { useEffect, useState } from 'react';
import { api } from './api.js';

// { id, name, slug, plan, logo_url } — voir GET /api/tenant. null tant que non chargé.
export function useTenant() {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    api
      .get('/tenant')
      .then(({ data }) => setTenant(data))
      .catch(() => {});
  }, []);

  return tenant;
}
