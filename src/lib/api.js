import axios from 'axios';
import { supabase } from './supabase.js';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Un jeton que le backend rejette (expiré, révoqué, ou un rafraîchissement Supabase resté
// bloqué côté client) laissait jusqu'ici l'utilisateur planté en silence : chaque hook avalait
// son échec indépendamment (voir useTenant.js ; useCurrentUser.js réessaie 3 fois puis
// abandonne aussi en silence), sans jamais reconnecter la session ni rediriger vers /login —
// la page restait affichée, vide ou figée, sans le moindre indice de ce qui n'allait pas (bug
// réel constaté : une rafale de 401 sur /users/me, /tenant, /notifications... sans fin). Login
// ne passe jamais par `api` (authentification via supabase.auth.signInWithPassword
// directement, voir Login.jsx) : un 401 ici ne peut donc jamais être un mot de passe refusé,
// toujours une session que le backend ne reconnaît plus.
//
// window.location.assign() plutôt qu'un navigate() du routeur : purge aussi tout état React
// devenu incohérent avec une session qui vient de disparaître, pas seulement l'écran affiché.
let loggingOut = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 503 && !window.location.pathname.startsWith('/maintenance')) {
      const maintenanceMessage = error.response.data?.error;
      if (maintenanceMessage) sessionStorage.setItem('maintenance-message', maintenanceMessage);
      window.location.assign('/maintenance');
    }
    if (error.response?.status === 401 && !loggingOut && !window.location.pathname.startsWith('/login')) {
      loggingOut = true;
      await supabase.auth.signOut().catch(() => {});
      window.location.assign('/login?expired=1');
    }
    return Promise.reject(error);
  }
);
