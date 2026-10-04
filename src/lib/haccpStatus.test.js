import test from 'node:test';
import assert from 'node:assert/strict';
import { CCP_VALIDATION_FIELDS, canPrepareCcp, isDocumentedControlDecision, ccpValidationIssues, isOperationalCcp, missingCcpValidationFields } from './haccpStatus.js';

test('CCP preparation requires a saved CCP decision, not just a significant hazard', () => {
  assert.equal(canPrepareCcp({ is_significant: true }), false);
  for (const control_type of ['prp', 'process_change', 'undetermined']) {
    assert.equal(canPrepareCcp({ control_type, decision_justification: 'Décision justifiée avec les mesures adaptées', is_significant: true }), false);
  }
  assert.equal(canPrepareCcp({ control_type: 'ccp', decision_justification: 'Maîtrise essentielle pour prévenir le danger' }), true);
  assert.equal(canPrepareCcp({ control_type: 'ccp', decision_justification: '12345678', is_significant: false }), true);
});

test('decision justification follows the server minimum and rejects placeholders', () => {
  for (const decision_justification of [undefined, null, ' ', '1234567', ' TBD ', 'à compléter', 'non renseigné', 'à confirmer']) {
    assert.equal(canPrepareCcp({ control_type: 'ccp', decision_justification }), false);
  }
  assert.equal(isDocumentedControlDecision({ control_type: 'prp', decision_justification: 'Prérequis vérifiés suffisants à cette étape' }), true);
  assert.equal(isDocumentedControlDecision({ control_type: 'invalid', decision_justification: 'Décision documentée' }), false);
});

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
  ]);
  assert.deepEqual(missingCcpValidationFields({ ...complete, verification_procedure: 'à compléter' }), [
    'Procédure de vérification (contenu à documenter)',
  ]);
  assert.deepEqual(missingCcpValidationFields({ ...complete, validation_source: '12345', validation_evidence: '12345678901234567890', monitoring_frequency: '12345678' }), []);
});

test('short frequencies are accepted but blanks and placeholders still block approval', () => {
  const complete = Object.fromEntries(CCP_VALIDATION_FIELDS.map(([field]) => [field, 'Documented validation evidence']));
  assert.deepEqual(missingCcpValidationFields({ ...complete, monitoring_frequency: 'Par lot', verification_frequency: 'Mensuel' }), []);
  assert.deepEqual(ccpValidationIssues({ ...complete, monitoring_frequency: ' ', verification_frequency: 'TBD' }), [
    { field: 'monitoring_frequency', message: 'Fréquence de surveillance' },
    { field: 'verification_frequency', message: 'Fréquence de vérification (contenu à documenter)' },
  ]);
});
