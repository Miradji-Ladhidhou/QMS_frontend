import test from 'node:test';
import assert from 'node:assert/strict';
import { CCP_VALIDATION_FIELDS, isOperationalCcp, missingCcpValidationFields } from './haccpStatus.js';

test('draft and unknown CCPs never enable surveillance', () => {
  assert.equal(isOperationalCcp({ status: 'draft' }), false);
  assert.equal(isOperationalCcp({}), false);
  assert.equal(isOperationalCcp({ status: 'invalid' }), false);
});

test('approved and legacy CCPs preserve operational surveillance', () => {
  assert.equal(isOperationalCcp({ status: 'approved' }), true);
  assert.equal(isOperationalCcp({ status: 'legacy' }), true);
});

test('approval completeness requires evidence and an assigned responsible person', () => {
  const complete = Object.fromEntries(CCP_VALIDATION_FIELDS.map(([field]) => [field, 'Documented validation evidence']));
  assert.deepEqual(missingCcpValidationFields(complete), []);
  assert.deepEqual(missingCcpValidationFields({ ...complete, validation_evidence: ' ', monitoring_responsible: null }), [
    'Preuves de validation',
    'Responsable de surveillance',
  ]);
  assert.equal(missingCcpValidationFields({}).length, CCP_VALIDATION_FIELDS.length);
});

test('approval completeness matches server minimum lengths and rejects placeholders', () => {
  const complete = Object.fromEntries(CCP_VALIDATION_FIELDS.map(([field]) => [field, 'Documented validation evidence']));
  assert.deepEqual(missingCcpValidationFields({ ...complete, validation_evidence: 'chiffre' }), [
    'Preuves de validation (au moins 20 caractères)',
  ]);
  assert.deepEqual(missingCcpValidationFields({ ...complete, validation_source: 'abcd', monitoring_frequency: 'daily' }), [
    'Source des limites (au moins 5 caractères)',
    'Fréquence de surveillance (au moins 8 caractères)',
  ]);
  assert.deepEqual(missingCcpValidationFields({ ...complete, verification_procedure: 'à compléter' }), [
    'Procédure de vérification (contenu à documenter)',
  ]);
  assert.deepEqual(missingCcpValidationFields({ ...complete, validation_source: '12345', validation_evidence: '12345678901234567890', monitoring_frequency: '12345678' }), []);
});
