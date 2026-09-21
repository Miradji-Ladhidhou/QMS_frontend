import { useEffect, useState } from 'react';
import { api } from './api.js';

// Postes déjà utilisés dans l'entreprise (comptes et personnel sans compte), avec les formations qu'ils rendent
// obligatoires — voir GET /users/job-titles. Réservé aux admin/manager : pour un autre rôle (ou en cas d'échec) la
// liste reste vide et la saisie du poste fonctionne sans suggestions.
export function useJobTitles(enabled = true) {
  const [data, setData] = useState({ job_titles: [], general_trainings: [] });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    api
      .get('/users/job-titles')
      .then(({ data: result }) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return data;
}

export const normalizeJobTitle = (title) => String(title || '').trim().toLowerCase();
