import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase.js';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
// En dessous de ce seuil, une nouvelle activité n'a pas besoin de relancer le minuteur — évite
// des dizaines de clearTimeout/setTimeout par seconde sur un mousemove continu.
const RESET_THROTTLE_MS = 5000;

// Déconnexion automatique après `timeoutMs` sans la moindre interaction (souris, clavier,
// scroll, tactile) — indépendant de la session Supabase elle-même, qui se renouvelle
// indéfiniment tant que le refresh token est valide (voir signOut() dans Layout.jsx, seul
// autre déclencheur de déconnexion). N'a d'effet que pendant que ce composant est monté, donc
// branché sur Layout.jsx qui n'existe que pour les routes authentifiées.
export function useInactivityLogout(timeoutMs) {
  const lastResetRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId;

    async function logout() {
      await supabase.auth.signOut();
      navigate('/login');
    }

    function resetTimer() {
      const now = Date.now();
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return;
      lastResetRef.current = now;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logout, timeoutMs);
    }

    timeoutId = setTimeout(logout, timeoutMs);
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [timeoutMs, navigate]);
}
