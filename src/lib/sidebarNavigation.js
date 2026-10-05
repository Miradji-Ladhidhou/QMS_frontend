export const SIDEBAR_CATEGORIES = [
  {
    id: 'pilotage',
    label: 'PILOTAGE',
    paths: ['/guide-resolution', '/kpis', '/planning', '/pdca', '/management-reviews'],
  },
  {
    id: 'qualite',
    label: 'QUALITÉ',
    paths: ['/documents', '/procedures', '/capas', '/nonconforming-outputs', '/audits', '/complaints', '/customer-satisfaction', '/my-approvals', '/quality-policy'],
  },
  {
    id: 'risques',
    label: 'RISQUES & SÉCURITÉ',
    paths: ['/risks', '/accidents', '/haccp', '/qqoqccp'],
  },
  {
    id: 'ressources',
    label: 'RESSOURCES',
    paths: ['/trainings', '/employees', '/services', '/suppliers'],
  },
];

export const SIDEBAR_PERMANENT_PATHS = ['/settings', '/prise-en-main'];

export function isSidebarItemActive(item, pathname) {
  return pathname === item.to || (!item.end && item.to !== '/' && pathname.startsWith(`${item.to}/`));
}

function getVisibleSidebarItems(items, { role, appModules, visibleMenuKeys }) {
  return items.filter(
    (item) =>
      !item.hiddenFromSidebar &&
      (!item.adminOnly || role === 'admin') &&
      (!item.key || appModules?.[item.key] !== false) &&
      (item.adminOnly || item.alwaysVisible || !visibleMenuKeys || visibleMenuKeys.includes(item.key))
  );
}

export function getSidebarCategories(items, options) {
  const visibleItems = getVisibleSidebarItems(items, options);
  return SIDEBAR_CATEGORIES.map((category) => ({
    ...category,
    items: category.paths.flatMap((path) => visibleItems.filter((item) => item.to === path)),
  })).filter((category) => category.items.length > 0);
}

export function getSidebarPermanentItems(items, options) {
  const visibleItems = getVisibleSidebarItems(items, options);
  return SIDEBAR_PERMANENT_PATHS.flatMap((path) => visibleItems.filter((item) => item.to === path));
}

export function getSidebarTopItems(items, options) {
  return getVisibleSidebarItems(items, options).filter((item) => item.to === '/');
}

export function getActiveSidebarCategory(categories, pathname) {
  return categories.find((category) => category.items.some((item) => isSidebarItemActive(item, pathname)))?.id;
}
