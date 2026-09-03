import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase.js';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
// En dessous de ce seuil, une nouvelle activité n'a pas besoin de mettre à jour l'horodatage —
// évite des dizaines d'écritures par seconde sur un mousemove continu.
const RESET_THROTTLE_MS = 5000;
// Fréquence de vérification "suis-je inactif depuis trop longtemps ?" — indépendante de la
// mise en veille, voir plus bas.
const CHECK_INTERVAL_MS = 30_000;

// Déconnexion automatique après `timeoutMs` sans la moindre interaction (souris, clavier,
// scroll, tactile) — indépendant de la session Supabase elle-même, qui se renouvelle
// indéfiniment tant que le refresh token est valide (voir signOut() dans Layout.jsx, seul
// autre déclencheur de déconnexion). N'a d'effet que pendant que ce composant est monté, donc
// branché sur Layout.jsx qui n'existe que pour les routes authentifiées.
//
// Volontairement PAS un setTimeout(logout, timeoutMs) unique : un ordinateur mis en veille
// gèle ce minuteur sans l'annuler, et le simple geste de réveil (toucher le trackpad/clavier
// pour déverrouiller) déclenche un mousemove/keydown qui relance un minuteur tout neuf avant
// que l'ancien, pourtant en retard, n'ait eu la chance de se déclencher — la session survit
// alors indéfiniment à une nuit de veille (bug réel constaté). On compare ici l'horloge murale
// (Date.now() - dernière activité) à intervalle régulier ET sur "visibilitychange", qui se
// déclenche au réveil avant tout mouvement de souris — le contrôle a donc lieu avant qu'un
// geste de réveil ne puisse rafraîchir l'horodatage.
export function useInactivityLogout(timeoutMs) {
  const lastActivityRef = useRef(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    let loggedOut = false;

    async function logout() {
      if (loggedOut) return;
      loggedOut = true;
      await supabase.auth.signOut();
      navigate('/login');
    }

    function checkIdle() {
      if (!loggedOut && Date.now() - lastActivityRef.current >= timeoutMs) {
        logout();
      }
    }

    function handleActivity() {
      const now = Date.now();
      if (now - lastActivityRef.current < RESET_THROTTLE_MS) return;
      lastActivityRef.current = now;
    }

    const intervalId = setInterval(checkIdle, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', checkIdle);
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', checkIdle);
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [timeoutMs, navigate]);
}
