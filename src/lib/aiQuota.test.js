import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaProgress, quotaWarning } from './aiQuota.js';

test('quota bars include reservations, clamp percentages and distinguish unlimited from blocked', () => {
  assert.equal(quotaProgress({ limit: null, used: 25, pending: 1 }), null);
  assert.equal(quotaProgress({ limit: 0, used: 0, pending: 0 }), 100);
  assert.equal(quotaProgress({ limit: 10, used: 7, pending: 1 }), 80);
  assert.equal(quotaProgress({ limit: 10, used: 15, pending: 1 }), 100);
  assert.equal(quotaProgress({ limit: 10, used: 0, pending: 0 }), 0);
});

test('warnings activate at exact 80 and 95 percent thresholds including pending actions', () => {
  const quota = (used, pending = 0) => ({ limit: 100, used, pending });
  assert.equal(quotaWarning(quota(79)), null);
  assert.equal(quotaWarning(quota(79, 1)).level, 'warning');
  assert.equal(quotaWarning(quota(94)).level, 'warning');
  assert.equal(quotaWarning(quota(94, 1)).level, 'critical');
  assert.equal(quotaWarning(quota(100)).level, 'reached');
  assert.equal(quotaWarning(quota(150)).level, 'reached');
  assert.equal(quotaWarning({ limit: null, used: 999, pending: 0 }), null);
  assert.equal(quotaWarning({ limit: 0, used: 0, pending: 0 }).level, 'blocked');
});
