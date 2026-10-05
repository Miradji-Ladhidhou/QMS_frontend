import { useMemo } from 'react';
import { getProblemRecommendations } from './problemGuide.js';

export function useProblemSearch(query, tenant, user, visibleMenuKeys) {
  const access = useMemo(() => ({ appModules: tenant?.app_modules, visibleMenuKeys }), [tenant?.app_modules, visibleMenuKeys]);
  const local = useMemo(() => getProblemRecommendations(query, access), [query, access]);
  const ready = Boolean(tenant && user && Array.isArray(visibleMenuKeys));
  return {
    ready,
    recommendations: ready ? local : [],
    pending: false,
    error: undefined,
    retry: () => {},
  };
}
