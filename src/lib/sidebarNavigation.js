export const SIDEBAR_CATEGORIES = [
  {
    id: 'pilotage',
    label: 'PILOTAGE',
    paths: ['/', '/kpis', '/planning', '/pdca', '/management-reviews'],
  },
  {
    id: 'qualite',
    label: 'MANAGEMENT DE LA QUALITÉ',
    paths: ['/documents', '/procedures', '/capas', '/nonconforming-outputs', '/audits', '/complaints', '/customer-satisfaction', '/my-approvals'],
  },
  {
    id: 'risques',
    label: 'RISQUES, SÉCURITÉ & MAÎTRISE',
    paths: ['/risks', '/accidents', '/haccp', '/qqoqccp'],
  },
  {
    id: 'ressources',
    label: 'RESSOURCES & PARTENAIRES',
    paths: ['/trainings', '/employees', '/suppliers'],
  },
  {
    id: 'referentiel',
    label: 'RÉFÉRENTIEL QUALITÉ',
    paths: ['/quality-policy'],
  },
  {
    id: 'administration',
    label: 'ADMINISTRATION',
    paths: ['/services', '/settings', '/guide-resolution', '/prise-en-main'],
  },
];

export function isSidebarItemActive(item, pathname) {
  return pathname === item.to || (!item.end && item.to !== '/' && pathname.startsWith(`${item.to}/`));
}

export function getSidebarCategories(items, { role, appModules, visibleMenuKeys }) {
  const visibleItems = items.filter(
    (item) =>
      !item.hiddenFromSidebar &&
      (!item.adminOnly || role === 'admin') &&
      (!item.key || appModules?.[item.key] !== false) &&
      (item.adminOnly || item.alwaysVisible || !visibleMenuKeys || visibleMenuKeys.includes(item.key))
  );

  return SIDEBAR_CATEGORIES.map((category) => ({
    ...category,
    items: category.paths.flatMap((path) => visibleItems.filter((item) => item.to === path)),
  })).filter((category) => category.items.length > 0 || category.id === 'administration');
}

export function getActiveSidebarCategory(categories, pathname) {
  return categories.find((category) => category.items.some((item) => isSidebarItemActive(item, pathname)))?.id;
}
