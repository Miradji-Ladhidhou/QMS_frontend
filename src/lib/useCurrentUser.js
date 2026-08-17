import { useEffect, useState } from 'react';
import { api } from './api.js';

// { id, full_name, role, tenant_id } — voir GET /api/users/me. null tant que non chargé.
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api
      .get('/users/me')
      .then(({ data }) => setCurrentUser(data))
      .catch(() => {});
  }, []);

  return currentUser;
}
