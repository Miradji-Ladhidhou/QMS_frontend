import test from 'node:test';
import assert from 'node:assert/strict';
import { getHaccpWorkflow, HACCP_DOSSIER_FIELDS, HACCP_WORKFLOW_STAGES } from './haccpWorkflow.js';

function planWith(hazards, overrides = {}) {
  return {
    status: 'draft',
    product_description: 'Produit décrit',
    scope: 'Périmètre décrit',
    team: 'Équipe HACCP',
    ...Object.fromEntries(HACCP_DOSSIER_FIELDS.slice(0, 8).map(([field]) => [field, 'Documenté avec les preuves'])),
    steps: [{ id: 'step-1', hazards }],
    ...overrides,
  };
}

const hazard = { control_type: 'ccp', decision_justification: 'Maîtrise essentielle à cette étape' };

test('workflow exposes four distinct preparation and monitoring stages', () => {
  assert.deepEqual(HACCP_WORKFLOW_STAGES.map((stage) => stage.id), ['dossier', 'analysis', 'ccps', 'surveillance']);
});

test('missing preliminary dossier information points to the dossier, even on active plans', () => {
  const workflow = getHaccpWorkflow(planWith([{ ...hazard, ccp: { status: 'approved' } }], {
    status: 'active', intended_use: ' ',
  }));
  assert.equal(workflow.next.stage, 'dossier');
  assert.equal(workflow.dossierCompleted, 7);
  assert.equal(workflow.dossierTotal, 8);
  assert.equal(workflow.operationalCcps, 1);
  assert.equal(workflow.pendingCcps, 0);
});

test('analysis guidance covers absent steps, unanalysed steps, missing decisions and process changes', () => {
  for (const plan of [
    planWith([], { steps: [] }),
    planWith([]),
    planWith([{ ...hazard, control_type: 'undetermined' }]),
    planWith([{ ...hazard, decision_justification: ' ' }]),
    planWith([{ ...hazard, control_type: 'process_change' }]),
    planWith([hazard], { steps: [{ hazards: [hazard] }, { hazards: [] }] }),
  ]) {
    assert.equal(getHaccpWorkflow(plan).next.stage, 'analysis');
  }
});

test('CCP decisions with missing CCPs and non-operational statuses need preparation', () => {
  for (const ccp of [undefined, { status: 'draft' }, { status: 'invalid' }, {}]) {
    assert.equal(getHaccpWorkflow(planWith([{ ...hazard, ccp }])).next.stage, 'ccps');
  }
});

test('legacy surveillance is preserved while guidance asks to document approval', () => {
  const workflow = getHaccpWorkflow(planWith([{ ...hazard, ccp: { status: 'legacy' } }], { status: 'active' }));
  assert.equal(workflow.next.stage, 'ccps');
  assert.equal(workflow.operationalCcps, 1);
  assert.equal(workflow.pendingCcps, 0);
});

test('validation notes and activation remain separate from CCP approval', () => {
  const approved = [{ ...hazard, ccp: { status: 'approved' } }];
  assert.equal(getHaccpWorkflow(planWith(approved, { validation_review_notes: '' })).next.stage, 'dossier');
  assert.equal(getHaccpWorkflow(planWith(approved)).next.stage, 'dossier');
  assert.equal(getHaccpWorkflow(planWith(approved, { status: 'active' })).next.stage, 'surveillance');
});

test('no-CCP plans need a conclusion and never imply CCP measurements', () => {
  const hazards = [{ control_type: 'prp', decision_justification: 'Bonnes pratiques suffisantes' }];
  assert.equal(getHaccpWorkflow(planWith(hazards)).next.label, 'Finaliser le dossier');
  const workflow = getHaccpWorkflow(planWith(hazards, { status: 'active', no_ccp_justification: 'Conclusion de l’équipe documentée' }));
  assert.equal(workflow.next.stage, 'dossier');
  assert.equal(workflow.ccps, 0);
  assert.equal(workflow.dossierCompleted, 8);
});

test('archived plans advise consultation rather than activation or new readings', () => {
  const workflow = getHaccpWorkflow(planWith([{ ...hazard, ccp: { status: 'approved' } }], { status: 'archived' }));
  assert.equal(workflow.next.label, 'Consulter le dossier');
});
