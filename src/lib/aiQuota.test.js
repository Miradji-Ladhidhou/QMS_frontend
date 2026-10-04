import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaProgress } from './aiQuota.js';

test('quota bars include reservations, clamp percentages and distinguish unlimited from blocked', () => {
  assert.equal(quotaProgress({ limit: null, used: 25, pending: 1 }), null);
  assert.equal(quotaProgress({ limit: 0, used: 0, pending: 0 }), 100);
  assert.equal(quotaProgress({ limit: 10, used: 7, pending: 1 }), 80);
  assert.equal(quotaProgress({ limit: 10, used: 15, pending: 1 }), 100);
  assert.equal(quotaProgress({ limit: 10, used: 0, pending: 0 }), 0);
});
