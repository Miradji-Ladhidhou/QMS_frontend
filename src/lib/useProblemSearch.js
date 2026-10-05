import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { getAvailableProblemModules, getProblemRecommendations, mergeProblemRecommendations, needsProblemFallback } from './problemGuide.js';
import { createProblemSearch } from './problemSearch.js';

export function useProblemSearch(query, tenant, user, visibleMenuKeys) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const search = useRef(null);
  if (!search.current) {
    search.current = createProblemSearch(async (text, signal) => {
      const { data } = await api.post('/ai/problem-guide-search', { query: text }, { signal });
      return data;
    });
  }
  const access = useMemo(() => ({ appModules: tenant?.app_modules, visibleMenuKeys }), [tenant?.app_modules, visibleMenuKeys]);
  const local = useMemo(() => getProblemRecommendations(query, access), [query, access]);
  const ready = Boolean(tenant && user && Array.isArray(visibleMenuKeys));
  const scope = JSON.stringify([tenant?.id, user?.id, user?.role]);
  const key = JSON.stringify([scope, query, getAvailableProblemModules(access).map(({ id }) => id), attempt]);
  const shouldSearch = ready && tenant.ai_modules?.problem_guide !== false &&
    query.trim().length >= 3 && query.length <= 1200 &&
    getAvailableProblemModules(access).length > 0 && needsProblemFallback(local);

  useEffect(() => {
    if (!shouldSearch) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      search.current(query, access, { scope, signal: controller.signal })
        .then((recommendations) => {
          if (!controller.signal.aborted) setResult({ key, recommendations });
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error('[guide résolution] recherche impossible :', error.response?.status || error.message);
          setResult({ key, error: 'La recherche est temporairement indisponible. Veuillez réessayer.' });
        });
    }, 700);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, shouldSearch, query, access, scope]);

  const current = shouldSearch && result?.key === key ? result : null;
  return {
    ready,
    recommendations: current?.recommendations
      ? mergeProblemRecommendations(local, current.recommendations, access) : local,
    pending: shouldSearch && !current,
    error: current?.error,
    retry: () => setAttempt((previous) => previous + 1),
  };
}
