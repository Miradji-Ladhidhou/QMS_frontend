import axios from 'axios';

// Client pour les pages publiques (aucune session) — volontairement distinct de `api` : celui-ci
// ajoute le jeton Supabase de l'utilisateur connecté et déconnecte sur un 401 (voir api.js), deux
// comportements qui n'ont aucun sens pour une personne qui ouvre un lien reçu par email, connectée
// ou non à l'application.
export const publicApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/public`,
});
