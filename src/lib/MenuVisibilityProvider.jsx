import { createContext, useEffect, useState } from 'react';
import { api } from './api.js';

export const MenuVisibilityContext = createContext(null);

// Un seul GET /tenant/menu par session — même correctif que CurrentUserProvider.jsx/
// TenantProvider.jsx, pour la même raison.
export function MenuVisibilityProvider({ children }) {
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    api
      .get('/tenant/menu')
      .then(({ data }) => setVisible(data.visible))
      .catch(() => setVisible(null));
  }, []);

  return <MenuVisibilityContext.Provider value={visible}>{children}</MenuVisibilityContext.Provider>;
}
