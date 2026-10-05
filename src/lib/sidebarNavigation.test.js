import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveSidebarCategory, getSidebarCategories, isSidebarItemActive, SIDEBAR_CATEGORIES } from './sidebarNavigation.js';

const expectedPaths = [
  ['/', '/kpis', '/planning', '/pdca', '/management-reviews'],
  ['/documents', '/procedures', '/capas', '/nonconforming-outputs', '/audits', '/complaints', '/customer-satisfaction', '/my-approvals'],
  ['/risks', '/accidents', '/haccp', '/qqoqccp'],
  ['/trainings', '/employees', '/suppliers'],
  ['/quality-policy'],
  ['/services', '/settings', '/prise-en-main'],
];
const alwaysVisiblePaths = ['/quality-policy', '/settings', '/prise-en-main'];
const items = expectedPaths.flat().map((to) => ({
  to,
  ...(alwaysVisiblePaths.includes(to)
    ? { alwaysVisible: true }
    : { key: to === '/' ? 'dashboard' : to.slice(1) }),
  ...(to === '/' ? { end: true } : {}),
}));

test('all 24 existing module links occur exactly once in the requested order', () => {
  const categories = getSidebarCategories(items, { role: 'admin' });
  assert.deepEqual(categories.map((category) => category.items.map((item) => item.to)), expectedPaths);
  assert.equal(new Set(categories.flatMap((category) => category.items.map((item) => item.to))).size, 24);
  assert.equal(categories.length, 6);
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
  assert.equal(getActiveSidebarCategory(categories, '/unknown'), undefined);
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
      '/documents', '/trainings', '/quality-policy', '/settings', '/prise-en-main',
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
});

test('legacy hidden groups and admin-only rules are preserved', () => {
  const additionalItems = [
    ...items,
    { to: '/documents', hiddenFromSidebar: true, alwaysVisible: true },
    { to: '/services', adminOnly: true },
  ];
  for (const role of ['manager', 'member']) {
    const categories = getSidebarCategories(additionalItems, { role });
    assert.equal(categories.flatMap((category) => category.items).length, 24);
  }
  const adminCategories = getSidebarCategories(additionalItems, { role: 'admin' });
  assert.equal(adminCategories.flatMap((category) => category.items).length, 25);
});

test('empty categories disappear but Administration remains for logout', () => {
  const categories = getSidebarCategories([], { role: 'member', visibleMenuKeys: [] });
  assert.deepEqual(categories, [{ ...SIDEBAR_CATEGORIES[5], items: [] }]);
});
