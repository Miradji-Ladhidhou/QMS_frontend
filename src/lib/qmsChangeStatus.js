export const QMS_CHANGE_STATUS_LABELS = {
  planned: 'Planifiée',
  approved: 'Approuvée',
  implemented: 'Mise en œuvre',
  cancelled: 'Annulée',
};

export const QMS_CHANGE_STATUS_STYLES = {
  planned: 'bg-blue-100 text-blue-700',
  approved: 'bg-amber-100 text-amber-700',
  implemented: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-700',
};

// Graphe de transition — dupliqué depuis backend/src/routes/qmsChanges.js#VALID_TRANSITIONS
// (deux repos séparés, pas de package commun ; même duplication assumée que
// menuVisibility.js#MENU_ITEM_KEYS/Layout.jsx#NAV_ITEMS). Piloté par le sélecteur de statut de
// QmsChangeDetail.jsx pour ne proposer que des transitions que le backend acceptera — jamais
// une source de vérité en soi, le backend revalide indépendamment.
export const QMS_CHANGE_VALID_TRANSITIONS = {
  planned: ['approved', 'cancelled'],
  approved: ['implemented', 'cancelled'],
};
