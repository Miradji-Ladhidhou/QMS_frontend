import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableProblemModules, getProblemRecommendations, mergeProblemRecommendations, needsProblemFallback, PROBLEM_GUIDE_MODULES } from './problemGuide.js';
import { PROBLEM_CONCEPTS } from './problemConcepts.js';

const allModules = [
  'complaints', 'customer-satisfaction', 'nonconforming-outputs', 'capas', 'qqoqccp',
  'suppliers', 'accidents', 'risks', 'trainings', 'employees', 'procedures', 'documents',
  'planning', 'kpis', 'pdca', 'audits', 'haccp',
];

function recommend(query, { disabled = [], hidden = [] } = {}) {
  return getProblemRecommendations(query, {
    appModules: Object.fromEntries(disabled.map((module) => [module, false])),
    visibleMenuKeys: allModules.filter((module) => !hidden.includes(module)),
  });
}

test('matches natural French problem descriptions to real QMS modules', () => {
  const complaintRecommendations = recommend('J’ai reçu une réclamation concernant un retard de livraison');
  assert.equal(complaintRecommendations[0].id, 'complaints');
  for (const id of ['customer-satisfaction', 'qqoqccp', 'capas', 'suppliers', 'planning']) {
    assert.ok(complaintRecommendations.some((module) => module.id === id), `${id} should match this context`);
  }
  assert.ok(recommend('Un produit est non conforme').some(({ id }) => id === 'nonconforming-outputs'));
  assert.ok(recommend('Un salarié doit être formé').some(({ id }) => id === 'trainings'));
  assert.ok(recommend('Nous avons identifié un risque').some(({ id }) => id === 'risks'));
  assert.ok(recommend('Un client est mécontent').some(({ id }) => id === 'complaints'));
  assert.ok(recommend('Nous recevons des produits défectueux d’un fournisseur').some(({ id }) => id === 'suppliers'));
  assert.ok(recommend('Nos employés ne maîtrisent pas une procédure').some(({ id }) => id === 'procedures'));
});

test('never recommends modules disabled for the tenant or hidden from the user', () => {
  const recommendations = recommend('J’ai une réclamation client et je veux une action corrective', {
    disabled: ['complaints'],
    hidden: ['capas'],
  });
  assert.equal(recommendations.some(({ id }) => id === 'complaints' || id === 'capas'), false);
  assert.ok(recommendations.length > 0);
});

test('does not show unrelated modules or recommendations while access is unknown', () => {
  assert.deepEqual(recommend('un sujet sans rapport'), []);
  assert.deepEqual(getProblemRecommendations('réclamation client', { appModules: {} }), []);
});

test('expiry concepts and variants are locally sufficient without AI', () => {
  for (const query of [
    'produit périmé', 'produit expiré', 'DLC dépassée', 'Nos produits sont périmés',
    'Ce lot a une date limite de consommation dépassée', 'la date de péremption est dépassée',
    'produit perime', 'produit périmmé', 'la DLC est dépassée',
  ]) {
    const results = recommend(query);
    assert.equal(results[0]?.id, 'nonconforming-outputs', query);
    assert.equal(needsProblemFallback(results), false, query);
  }
  assert.ok(recommend('DLC dépassée').some(({ id }) => id === 'haccp'));
});

test('natural wording and bounded typos match concepts, not arbitrary substrings', () => {
  for (const query of ['client mécontent', 'nos clients sont très mécontents', 'client mecontant']) {
    const results = recommend(query);
    assert.equal(results[0]?.id, 'complaints', query);
    assert.equal(needsProblemFallback(results), false, query);
  }
  for (const query of ['erreur de préparation', 'erreurs lors de la préparation', 'erreur pendant notre préparation', 'erreur de preparaton']) {
    const results = recommend(query);
    assert.equal(results[0]?.id, 'nonconforming-outputs', query);
    assert.equal(needsProblemFallback(results), false, query);
    assert.ok(results.some(({ id }) => id === 'qqoqccp'));
    assert.ok(results.some(({ id }) => id === 'capas'));
  }
  assert.deepEqual(recommend('risquer un commentaire documentaire'), []);
});

test('confidence threshold is explicit and synonym repetition cannot inflate scores', () => {
  assert.equal(needsProblemFallback([{ score: 89 }]), true);
  assert.equal(needsProblemFallback([{ score: 90 }]), false);
  assert.equal(needsProblemFallback([]), true);
  assert.equal(recommend('client mécontent mécontent mécontent')[0].score, recommend('client mécontent')[0].score);
});

test('merge deduplicates, sorts, filters access and ignores provider metadata', () => {
  const access = { visibleMenuKeys: ['capas', 'complaints'], appModules: { complaints: false } };
  const results = mergeProblemRecommendations([{ id: 'capas', score: 60 }], [
    { id: 'capas', score: 100, path: '/fake', description: 'Invented' },
    { id: 'complaints', score: 120 }, { id: 'ishikawa', score: 120 },
    { id: 'risks', score: 100 }, { id: 'capas', score: NaN },
  ], access);
  assert.equal(results.length, 1);
  assert.equal(results[0].score, 100);
  assert.equal(results[0].path, '/capas');
  assert.equal(results[0].description, PROBLEM_GUIDE_MODULES.find(({ id }) => id === 'capas').description);
  assert.deepEqual(getAvailableProblemModules({ visibleMenuKeys: [] }), []);
});

test('concept associations are limited to real modules', () => {
  const ids = new Set(PROBLEM_GUIDE_MODULES.map(({ id }) => id));
  for (const concept of PROBLEM_CONCEPTS) {
    assert.ok(concept.variants.length > 0);
    for (const association of concept.modules) assert.ok(ids.has(association.id));
  }
});
