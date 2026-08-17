export const ROLE_LABELS = {
  owner: 'Propriétaire',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Membre',
};

export const ASSIGNABLE_ROLES = ['admin', 'manager', 'member'];

// Miroir de requireRole('owner', 'admin', 'manager') côté backend : CRUD complet sur CAPA,
// KPI et QQOQCCP. Un 'member' garde créer+lire (voir chaque backend pour les exceptions,
// ex. QQOQCCP où l'auteur modifie sa propre analyse tant qu'elle n'est pas validée).
export const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}
