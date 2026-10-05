import {
  getAvailableProblemModules,
  getProblemRecommendations,
  mergeProblemRecommendations,
  needsProblemFallback,
  normalizeProblemQuery,
} from './problemGuide.js';

export function createProblemSearch(request, now = Date.now) {
  const cache = new Map();
  return async function search(query, access, { scope, enabled = true, signal } = {}) {
    const local = getProblemRecommendations(query, access);
    if (!enabled || query.trim().length < 3 || query.length > 1200 ||
        !getAvailableProblemModules(access).length || !needsProblemFallback(local)) return local;
    const key = JSON.stringify([scope, normalizeProblemQuery(query),
      getAvailableProblemModules(access).map(({ id }) => id).sort()]);
    const cached = cache.get(key);
    if (cached && now() - cached.time < 300000) {
      return mergeProblemRecommendations(local, cached.results, access);
    }
    const response = await request(query, signal);
    if (!response || !Array.isArray(response.recommendations)) {
      throw new Error('Réponse de recherche invalide.');
    }
    if (signal?.aborted) return local;
    cache.delete(key);
    cache.set(key, { time: now(), results: response.recommendations });
    if (cache.size > 30) cache.delete(cache.keys().next().value);
    return mergeProblemRecommendations(local, response.recommendations, access);
  };
}
