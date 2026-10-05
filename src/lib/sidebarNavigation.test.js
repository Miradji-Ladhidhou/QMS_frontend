import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveSidebarCategory, getSidebarCategories, getSidebarPermanentItems, getSidebarTopItems, isSidebarItemActive, SIDEBAR_PERMANENT_PATHS } from './sidebarNavigation.js';

const expectedPaths = [
  ['/kpis', '/planning', '/pdca', '/management-reviews'],
  ['/documents', '/procedures', '/capas', '/nonconforming-outputs', '/audits', '/complaints', '/customer-satisfaction', '/my-approvals', '/quality-policy'],
  ['/risks', '/accidents', '/haccp', '/qqoqccp'],
  ['/trainings', '/employees', '/services', '/suppliers'],
];
const alwaysVisiblePaths = ['/quality-policy', '/settings', '/guide-resolution', '/prise-en-main', '/liens-utiles'];
const items = ['/', '/guide-resolution', ...expectedPaths.flat(), ...SIDEBAR_PERMANENT_PATHS].map((to) => ({
  to,
  ...(alwaysVisiblePaths.includes(to)
    ? { alwaysVisible: true }
    : { key: to === '/' ? 'dashboard' : to.slice(1) }),
  ...(to === '/' ? { end: true } : {}),
}));

test('all sidebar links occur exactly once in the requested order', () => {
  const categories = getSidebarCategories(items, { role: 'admin' });
  assert.deepEqual(categories.map((category) => category.items.map((item) => item.to)), expectedPaths);
  const permanentItems = getSidebarPermanentItems(items, { role: 'admin' });
  assert.deepEqual(permanentItems.map((item) => item.to), ['/settings', '/prise-en-main', '/liens-utiles']);
  const topItems = getSidebarTopItems(items, { role: 'admin' });
  assert.deepEqual(topItems.map((item) => item.to), ['/', '/guide-resolution']);
  assert.deepEqual(getSidebarTopItems([...items].reverse(), { role: 'admin' }).map((item) => item.to), ['/', '/guide-resolution']);
  const allItems = [...topItems, ...categories.flatMap((category) => category.items), ...permanentItems];
  assert.equal(allItems.length, 26);
  assert.equal(new Set(allItems.map((item) => item.to)).size, 26);
  assert.equal(categories.length, 4);
  assert.deepEqual(categories.map((category) => category.label), ['PILOTAGE', 'QUALITÉ', 'RISQUES & SÉCURITÉ', 'RESSOURCES']);
});

test('active category follows every module, including details and nested tools', () => {
  const categories = getSidebarCategories(items, { role: 'admin' });
  for (const category of categories) {
    for (const item of category.items) {
      assert.equal(getActiveSidebarCategory(categories, item.to), category.id);
      if (item.to !== '/') {
        assert.equal(getActiveSidebarCategory(categories, `${item.to}/example-id`), category.id);
      }
    }
  }
  assert.equal(getActiveSidebarCategory(categories, '/trainings/matrix'), 'ressources');
  assert.equal(getActiveSidebarCategory(categories, '/haccp/today'), 'risques');
  assert.equal(getActiveSidebarCategory(categories, '/kpis/modules'), 'pilotage');
  assert.equal(getActiveSidebarCategory(categories, '/guide-resolution'), undefined);
  assert.equal(getActiveSidebarCategory(categories, '/services'), 'ressources');
  assert.equal(getActiveSidebarCategory(categories, '/quality-policy'), 'qualite');
  assert.equal(getActiveSidebarCategory(categories, '/unknown'), undefined);
  assert.equal(getActiveSidebarCategory(categories, '/'), undefined);
  for (const path of SIDEBAR_PERMANENT_PATHS) {
    assert.equal(getActiveSidebarCategory(categories, path), undefined);
    assert.equal(getActiveSidebarCategory(categories, `${path}/example-id`), undefined);
  }
});

test('active links use path boundaries and Dashboard matches only the root', () => {
  assert.equal(isSidebarItemActive(items[0], '/documents'), false);
  assert.equal(isSidebarItemActive({ to: '/documents' }, '/documents-other'), false);
  assert.equal(isSidebarItemActive({ to: '/documents' }, '/documents/id'), true);
  assert.equal(isSidebarItemActive({ to: '/documents', end: true }, '/documents/id'), false);
});

test('visibility rules preserve role/user restrictions and always-visible links', () => {
  for (const role of ['admin', 'manager', 'member']) {
    const categories = getSidebarCategories(items, { role, visibleMenuKeys: ['documents', 'trainings'] });
    assert.deepEqual(categories.flatMap((category) => category.items.map((item) => item.to)), [
      '/documents', '/quality-policy', '/trainings',
    ]);
    assert.deepEqual(getSidebarPermanentItems(items, { role, visibleMenuKeys: ['documents', 'trainings'] }).map((item) => item.to), [
      '/settings', '/prise-en-main', '/liens-utiles',
    ]);
    assert.equal(categories.some((category) => category.id === 'risques'), false);
  }
});

test('disabled company modules stay hidden even when their menu key is visible', () => {
  const categories = getSidebarCategories(items, {
    role: 'admin',
    visibleMenuKeys: ['documents', 'trainings'],
    appModules: { documents: false },
  });
  assert.equal(categories.some((category) => category.items.some((item) => item.to === '/documents')), false);
  assert.equal(getActiveSidebarCategory(categories, '/documents/id'), undefined);
  assert.equal(getActiveSidebarCategory(categories, '/trainings/matrix'), 'ressources');
  assert.deepEqual(getSidebarPermanentItems(items, {
    role: 'admin',
    visibleMenuKeys: ['services'],
    appModules: { services: false },
  }).map((item) => item.to), ['/settings', '/prise-en-main', '/liens-utiles']);
  const disabledServices = getSidebarCategories(items, {
    role: 'admin',
    visibleMenuKeys: ['services'],
    appModules: { services: false },
  });
  assert.equal(getActiveSidebarCategory(disabledServices, '/services'), undefined);
});

test('legacy hidden groups and admin-only rules are preserved', () => {
  const additionalItems = [
    ...items,
    { to: '/documents', hiddenFromSidebar: true, alwaysVisible: true },
    { to: '/services', adminOnly: true },
  ];
  for (const role of ['manager', 'member']) {
    const categories = getSidebarCategories(additionalItems, { role });
    assert.equal(categories.flatMap((category) => category.items).length, 21);
    assert.equal(getSidebarPermanentItems(additionalItems, { role }).length, 3);
  }
  const adminCategories = getSidebarCategories(additionalItems, { role: 'admin' });
  assert.equal(adminCategories.flatMap((category) => category.items).length, 22);
  assert.equal(getSidebarPermanentItems(additionalItems, { role: 'admin' }).length, 3);
});

test('empty categories disappear without an Administration accordion', () => {
  const categories = getSidebarCategories([], { role: 'member', visibleMenuKeys: [] });
  assert.deepEqual(categories, []);
  assert.deepEqual(getSidebarPermanentItems([], { role: 'member', visibleMenuKeys: [] }), []);
  assert.deepEqual(getSidebarTopItems([], { role: 'member', visibleMenuKeys: [] }), []);
});

test('pinned Dashboard preserves menu and company visibility rules', () => {
  for (const role of ['admin', 'manager', 'member']) {
    assert.deepEqual(getSidebarTopItems(items, { role, visibleMenuKeys: ['dashboard'] }).map((item) => item.to), ['/', '/guide-resolution']);
    assert.deepEqual(getSidebarTopItems(items, { role, visibleMenuKeys: [] }).map((item) => item.to), ['/guide-resolution']);
    assert.deepEqual(getSidebarTopItems(items, {
      role, visibleMenuKeys: ['dashboard'], appModules: { dashboard: false },
    }).map((item) => item.to), ['/guide-resolution']);
  }
});

test('pinned Guide de résolution stays available to every role outside categories', () => {
  for (const role of ['admin', 'manager', 'member']) {
    const options = { role, visibleMenuKeys: [] };
    assert.deepEqual(getSidebarPermanentItems(items, options).map((item) => item.to), [
      '/settings', '/prise-en-main', '/liens-utiles',
    ]);
    assert.deepEqual(getSidebarTopItems(items, options).map((item) => item.to), ['/guide-resolution']);
    assert.equal(getActiveSidebarCategory(getSidebarCategories(items, options), '/guide-resolution'), undefined);
  }
});
