import { api } from './api.js';

// "Uniquement moi" : résout (et crée au besoin, côté serveur) la catégorie personnelle de
// l'utilisateur courant pour ce module — voir POST /api/module-categories/personal. Le
// category_id obtenu est ensuite envoyé normalement dans le payload de création/édition, comme
// n'importe quel autre category_id choisi dans le sélecteur.
export async function resolvePersonalCategoryId(resourceType) {
  const { data } = await api.post('/module-categories/personal', { resource_type: resourceType });
  return data.id;
}
