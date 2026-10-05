import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectorProblems, getSectorRecommendations, PROBLEM_SECTORS } from './problemSectorCatalog.js';
import { getSectorProblemGuide } from './problemSectorGuides.js';
import { PROBLEM_GUIDE_MODULES } from './problemGuide.js';

const access = { visibleMenuKeys: PROBLEM_GUIDE_MODULES.map(({ id }) => id) };

test('every sector/problem pair has a complete personalized guide with real module links', () => {
  for (const sector of PROBLEM_SECTORS) {
    for (const problem of getSectorProblems(sector.id)) {
      const guide = getSectorProblemGuide(sector.id, problem.id, access);
      assert.equal(guide.sector, sector.label);
      assert.equal(guide.problem, problem.label);
      assert.ok(guide.introduction.includes(sector.label));
      assert.ok(guide.introduction.includes(problem.label));
      assert.equal(guide.introduction.includes('undefined'), false);
      assert.ok(guide.facts.length > 25);
      const results = getSectorRecommendations(sector.id, problem.id, access);
      assert.equal(guide.steps.length, Math.min(results.length, 3));
      for (const step of guide.steps) {
        assert.equal(step.path, results.find(({ id }) => id === step.id).path);
        assert.ok(step.description.includes(sector.label));
        assert.ok(step.description.includes(problem.label));
      }
    }
  }
});

test('guidance distinguishes different problems and contexts rather than swapping headings only', () => {
  const expiry = getSectorProblemGuide('restaurants', 'food:expiry', access);
  const cold = getSectorProblemGuide('restaurants', 'food:cold', access);
  assert.match(expiry.facts, /DLC ou DDM/);
  assert.match(cold.facts, /températures relevées/);
  assert.notEqual(expiry.facts, cold.facts);
  const logistics = getSectorProblemGuide('logistics', 'logistics:picking', access);
  assert.match(logistics.facts, /quantités attendues/);
  const software = getSectorProblemGuide('it', 'technology:bug', access);
  assert.match(software.facts, /étapes de reproduction/);
  assert.notEqual(getSectorProblemGuide('it', 'common:complaint', access).introduction,
    getSectorProblemGuide('restaurants', 'common:complaint', access).introduction);
  const bakery = getSectorProblemGuide('bakery', 'sector.bakery:fermentation', access);
  assert.match(bakery.facts, /fermentation/);
  assert.ok(bakery.notice);
  assert.match(bakery.introduction, /produit alimentaire/);
  assert.equal(bakery.introduction.includes('undefined'), false);
  const hotel = getSectorProblemGuide('hotel', 'sector.hotel:room-status', access);
  assert.match(hotel.facts, /avant attribution/);
  assert.match(hotel.introduction, /réservation/);
  assert.equal(getSectorProblemGuide('it', 'common:backup', access), null);
  assert.match(getSectorProblemGuide('it', 'technology:backup', access).facts, /restauration/);
  assert.match(getSectorProblemGuide('it', 'common:effectiveness', access).facts, /vérification/);
});

test('every expanded guide filters both tenant-disabled and user-hidden module links', () => {
  const restrictedAccess = {
    visibleMenuKeys: PROBLEM_GUIDE_MODULES.map(({ id }) => id).filter((id) => id !== 'capas'),
    appModules: { haccp: false, risks: false, documents: false },
  };
  for (const sector of PROBLEM_SECTORS) {
    for (const problem of getSectorProblems(sector.id)) {
      const guide = getSectorProblemGuide(sector.id, problem.id, restrictedAccess);
      assert.ok(guide.steps.every(({ id }) => !['haccp', 'risks', 'documents', 'capas'].includes(id)),
        `${sector.id}/${problem.id}`);
      const unavailable = getSectorProblemGuide(sector.id, problem.id, { visibleMenuKeys: [] });
      assert.deepEqual(unavailable.steps, []);
    }
  }
});

test('guides never mention or link modules disabled for a tenant or user', () => {
  const guide = getSectorProblemGuide('restaurants', 'food:expiry', {
    visibleMenuKeys: ['nonconforming-outputs', 'haccp'], appModules: { haccp: false },
  });
  assert.deepEqual(guide.steps.map(({ id }) => id), ['nonconforming-outputs']);
  assert.equal(JSON.stringify(guide).includes('HACCP'), false);
  const noAccess = getSectorProblemGuide('restaurants', 'food:expiry', { visibleMenuKeys: [] });
  assert.deepEqual(noAccess.steps, []);
  assert.ok(noAccess.facts);
  const restrictedNew = getSectorProblemGuide('bakery', 'sector.bakery:fermentation', {
    visibleMenuKeys: ['nonconforming-outputs', 'haccp'], appModules: { haccp: false },
  });
  assert.deepEqual(restrictedNew.steps.map(({ id }) => id), ['nonconforming-outputs']);
});

test('invalid sector/problem pairs have no guide and safety notices are contextual', () => {
  assert.equal(getSectorProblemGuide('it', 'food:expiry', access), null);
  assert.equal(getSectorProblemGuide('', '', access), null);
  assert.ok(getSectorProblemGuide('construction', 'construction:height', access).notice);
  assert.equal(getSectorProblemGuide('it', 'technology:bug', access).notice, null);
});
