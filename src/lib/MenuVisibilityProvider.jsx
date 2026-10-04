import { createContext, useEffect, useState } from 'react';
import { api } from './api.js';

export const MenuVisibilityContext = createContext(null);

// Un seul GET /tenant/menu par session — même correctif que CurrentUserProvider.jsx/
// TenantProvider.jsx, pour la même raison.
export function MenuVisibilityProvider({ children }) {
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    let active = true;
    function refresh() {
      api.get('/tenant/menu')
        .then(({ data }) => { if (active) setVisible(data.visible); })
        .catch((error) => {
          console.error('Impossible de charger les accès aux modules :', error.response?.status || error.message);
          if (active) setVisible(null);
        });
    }
    refresh();
    window.addEventListener('tenant-refresh', refresh);
    window.addEventListener('menu-visibility-refresh', refresh);
    return () => {
      active = false;
      window.removeEventListener('tenant-refresh', refresh);
      window.removeEventListener('menu-visibility-refresh', refresh);
    };
  }, []);

  return <MenuVisibilityContext.Provider value={visible}>{children}</MenuVisibilityContext.Provider>;
}
