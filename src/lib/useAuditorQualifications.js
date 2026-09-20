import { useEffect, useState } from 'react';
import { api } from './api.js';

// Formations qualifiantes + statut de qualification de chaque personne, pour les pages Audits.
// Un échec (menu Audits masqué, réseau…) laisse simplement l'indicateur absent : ce n'est qu'un
// repère, jamais une donnée dont la page dépend.
export function useAuditorQualifications() {
  const [state, setState] = useState({ loading: true, trainings: [], byUser: {} });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/audits/auditor-qualifications')
      .then(({ data }) => {
        if (!cancelled) setState({ loading: false, trainings: data.trainings || [], byUser: data.by_user || {} });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, trainings: [], byUser: {} });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
