import test from 'node:test';
import assert from 'node:assert/strict';
import { getProblemRecommendations } from './problemGuide.js';

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
