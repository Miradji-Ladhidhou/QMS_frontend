import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectorProblems, getSectorRecommendations, PROBLEM_SECTORS } from './problemSectorCatalog.js';
import { PROBLEM_GUIDE_MODULES } from './problemGuide.js';
import { COMMON_SITUATIONS, PROFILE_SITUATIONS, SECTOR_SITUATIONS } from './problemSectorSituations.js';

const access = { visibleMenuKeys: PROBLEM_GUIDE_MODULES.map(({ id }) => id) };
const sortLabels = (items) => [...items].sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));

test('sector and problem catalogs are broad, alphabetical and free of duplicates', () => {
  assert.ok(PROBLEM_SECTORS.length >= 60);
  assert.deepEqual(PROBLEM_SECTORS, sortLabels(PROBLEM_SECTORS));
  assert.equal(new Set(PROBLEM_SECTORS.map(({ id }) => id)).size, PROBLEM_SECTORS.length);
  assert.equal(new Set(PROBLEM_SECTORS.map(({ label }) => label)).size, PROBLEM_SECTORS.length);
  const distinctProblems = new Set();
  for (const sector of PROBLEM_SECTORS) {
    const problems = getSectorProblems(sector.id);
    assert.ok(problems.length >= 55, `${sector.label}: ${problems.length}`);
    assert.ok(problems.filter(({ id }) => id.startsWith(`sector.${sector.id}:`)).length >= 2, sector.label);
    assert.deepEqual(problems, sortLabels(problems));
    assert.equal(new Set(problems.map(({ id }) => id)).size, problems.length);
    assert.equal(new Set(problems.map(({ label }) => label)).size, problems.length);
    for (const problem of problems) distinctProblems.add(problem.id);
  }
  assert.ok(distinctProblems.size >= 600, `${distinctProblems.size} distinct problems`);
});

test('extended situations cover every profile and sector with explicit personalized evidence', () => {
  assert.deepEqual(Object.keys(SECTOR_SITUATIONS).sort(), PROBLEM_SECTORS.map(({ id }) => id).sort());
  assert.deepEqual(Object.keys(PROFILE_SITUATIONS).sort(),
    [...new Set(PROBLEM_SECTORS.flatMap(({ profiles }) => profiles))].sort());
  for (const situations of [COMMON_SITUATIONS, ...Object.values(PROFILE_SITUATIONS), ...Object.values(SECTOR_SITUATIONS)]) {
    for (const [id, label, pathway, facts] of situations) {
      assert.ok(id && label && pathway);
      assert.ok(facts.length > 25, id);
    }
  }
});

test('every sector problem maps deterministically to existing routes and ranked modules', () => {
  const catalog = new Map(PROBLEM_GUIDE_MODULES.map((module) => [module.id, module]));
  for (const sector of PROBLEM_SECTORS) {
    for (const problem of getSectorProblems(sector.id)) {
      const results = getSectorRecommendations(sector.id, problem.id, access);
      assert.ok(results.length >= 2 && results.length <= 4, `${sector.id}/${problem.id}`);
      assert.equal(new Set(results.map(({ id }) => id)).size, results.length);
      for (const [index, module] of results.entries()) {
        assert.equal(module.path, catalog.get(module.id).path);
        assert.ok(module.score >= 50 && module.score <= 120);
        if (index) assert.ok(results[index - 1].score >= module.score);
      }
    }
  }
});

test('sector-specific problems do not leak into unrelated activities', () => {
  assert.ok(getSectorProblems('restaurants').some(({ id }) => id === 'food:expiry'));
  assert.equal(getSectorProblems('it').some(({ id }) => id === 'food:expiry'), false);
  assert.equal(getSectorProblems('health').some(({ id }) => id === 'food:expiry'), false);
  assert.equal(getSectorProblems('food-industry').some(({ id }) => id === 'technology:bug'), false);
  assert.deepEqual(getSectorProblems(''), []);
  assert.deepEqual(getSectorRecommendations('it', 'food:expiry', access), []);
  assert.equal(getSectorProblems('retail').some(({ id }) => id === 'sector.bakery:fermentation'), false);
  assert.deepEqual(getSectorRecommendations('restaurants', 'sector.bakery:fermentation', access), []);
});

test('recommends relevant modules for concrete business situations', () => {
  assert.equal(getSectorRecommendations('restaurants', 'food:expiry', access)[0].id, 'nonconforming-outputs');
  assert.ok(getSectorRecommendations('restaurants', 'food:cold', access).some(({ id }) => id === 'haccp'));
  assert.deepEqual(getSectorRecommendations('logistics', 'logistics:picking', access).map(({ id }) => id),
    ['nonconforming-outputs', 'qqoqccp', 'capas']);
  assert.equal(getSectorRecommendations('retail', 'common:complaint', access)[0].id, 'complaints');
  assert.equal(getSectorRecommendations('construction', 'construction:height', access)[0].id, 'accidents');
  assert.equal(getSectorRecommendations('health', 'health:expiry', access).some(({ id }) => id === 'haccp'), false);
  assert.ok(getSectorRecommendations('bakery', 'sector.bakery:fermentation', access).some(({ id }) => id === 'haccp'));
  assert.deepEqual(getSectorRecommendations('it', 'technology:access', access).map(({ id }) => id), ['risks', 'planning']);
  assert.equal(getSectorRecommendations('hotel', 'sector.hotel:room-status', access)[0].id, 'nonconforming-outputs');
});

test('tenant and user restrictions filter results without adding unrelated alternatives', () => {
  const restricted = { visibleMenuKeys: ['nonconforming-outputs', 'haccp'], appModules: { haccp: false } };
  assert.deepEqual(getSectorRecommendations('restaurants', 'food:expiry', restricted).map(({ id }) => id), ['nonconforming-outputs']);
  assert.deepEqual(getSectorRecommendations('restaurants', 'food:expiry', {}), []);
  assert.deepEqual(getSectorRecommendations('restaurants', 'food:expiry', { visibleMenuKeys: [] }), []);
  assert.deepEqual(getSectorRecommendations('unknown', 'food:expiry', access), []);
});
