import { useCurrentUser } from './useCurrentUser.js';

// Le rôle de l'utilisateur connecté (admin/manager/member), tel que peuplé côté backend
// par req.userRole (voir middleware/auth.js) et exposé par GET /users/me. useCurrentUser()
// fait déjà cet appel et sert de "contexte utilisateur" au sens de ce hook — pas de second
// fetch ici, juste la valeur qui nous intéresse. null tant que le profil n'est pas chargé.
export function useRole() {
  const currentUser = useCurrentUser();
  return currentUser?.role ?? null;
}
