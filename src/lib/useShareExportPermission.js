import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from './api.js';

export function useShareExportPermission() {
  const { pathname } = useLocation();
  const [state, setState] = useState({ allowed: false, error: '', loading: true });
  useEffect(() => {
    let active = true;
    async function refresh() {
      setState({ allowed: false, error: '', loading: true });
      try {
        await api.post('/shares/check-export', { path: pathname });
        if (active) setState({ allowed: true, error: '', loading: false });
      } catch (err) {
        if (active) setState({ allowed: false, error: err.response?.data?.error || 'Impossible de vérifier le droit d’export.', loading: false });
      }
    }
    refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [pathname]);
  return state;
}
