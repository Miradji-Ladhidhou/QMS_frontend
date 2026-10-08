import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceExportUrl } from './evidenceExportSelection.js';

test('keeps exports unchanged before photos are loaded', () => {
  assert.equal(buildEvidenceExportUrl('/capas/id/pdf', {}), '/capas/id/pdf');
});

test('serializes selected and explicitly excluded photos independently for every record', () => {
  const selections = {
    'suppliers:supplier-id': ['photo-a'],
    'supplier-evaluations:evaluation-a': [],
    'supplier-evaluations:evaluation-b': ['photo-b'],
  };
  const url = new URL(buildEvidenceExportUrl('/suppliers/id/word?format=docx', selections), 'https://qms.test');
  assert.equal(url.searchParams.get('format'), 'docx');
  assert.deepEqual(JSON.parse(url.searchParams.get('evidenceSelections')), selections);
});

for (const moduleKey of ['capas', 'audits', 'complaints', 'accidents', 'nonconforming-outputs', 'haccp', 'risks', 'pdca', 'qqoqccp']) {
  test(`encodes the photo selection for ${moduleKey} PDF and Word exports`, () => {
    for (const format of ['pdf', 'word']) {
      const selections = { [`${moduleKey}:record-id`]: ['photo-id'] };
      const url = new URL(buildEvidenceExportUrl(`/${moduleKey}/record-id/${format}`, selections), 'https://qms.test');
      assert.deepEqual(JSON.parse(url.searchParams.get('evidenceSelections')), selections);
    }
  });
}
