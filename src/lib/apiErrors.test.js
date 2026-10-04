import test from 'node:test';
import assert from 'node:assert/strict';
import { isMaintenanceResponse } from './apiErrors.js';

test('only an explicit platform maintenance 503 triggers maintenance', () => {
  assert.equal(isMaintenanceResponse({
    status: 503,
    data: { code: 'PLATFORM_MAINTENANCE', error: 'Scheduled maintenance' },
  }), true);
});

test('AI failures and other unavailable services do not trigger maintenance', () => {
  for (const response of [
    { status: 503, data: { error: 'AI suggestions are incomplete' } },
    { status: 503, data: { code: 'AI_UNAVAILABLE' } },
    { status: 503 },
    { status: 500, data: { code: 'PLATFORM_MAINTENANCE' } },
    { status: 401, data: { error: 'Expired session' } },
    undefined,
  ]) {
    assert.equal(isMaintenanceResponse(response), false);
  }
});
