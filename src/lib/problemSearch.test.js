import test from 'node:test';
import assert from 'node:assert/strict';
import { createProblemSearch } from './problemSearch.js';
import { PROBLEM_GUIDE_MODULES } from './problemGuide.js';

const access = { visibleMenuKeys: PROBLEM_GUIDE_MODULES.map(({ id }) => id) };

test('all required searches are local and never invoke the fallback', async () => {
  let calls = 0;
  const search = createProblemSearch(async () => { calls++; throw new Error('Must not be called'); });
  for (const query of ['produit périmé', 'produit expiré', 'DLC dépassée', 'client mécontent', 'erreur de préparation']) {
    assert.ok((await search(query, access)).length);
  }
  assert.equal(calls, 0);
});

test('weak local matches trigger one fallback, merge results and cache per user/access', async () => {
  let calls = 0;
  let clock = 0;
  const search = createProblemSearch(async () => {
    calls++;
    return { recommendations: [{ id: 'kpis', score: 110 }, { id: 'planning', score: 90 }, { id: 'fake', score: 120 }] };
  }, () => clock);
  const result = await search('beaucoup de problèmes inexpliqués', access, { scope: 'tenantA/userA' });
  assert.equal(result[0].id, 'kpis');
  assert.equal(result.filter(({ id }) => id === 'kpis').length, 1);
  assert.equal(result.some(({ id }) => id === 'fake'), false);
  await search('beaucoup de problèmes inexpliqués', access, { scope: 'tenantA/userA' });
  assert.equal(calls, 1);
  await search('beaucoup de problèmes inexpliqués', access, { scope: 'tenantB/userA' });
  assert.equal(calls, 2);
  const restricted = await search('beaucoup de problèmes inexpliqués', { visibleMenuKeys: ['planning'] }, { scope: 'tenantA/userA' });
  assert.deepEqual(restricted.map(({ id }) => id), ['planning']);
  assert.equal(calls, 3);
  clock = 300001;
  await search('beaucoup de problèmes inexpliqués', access, { scope: 'tenantA/userA' });
  assert.equal(calls, 4);
});

test('unknown access, disabled fallback and incomplete queries do not spend quota', async () => {
  let calls = 0;
  const search = createProblemSearch(async () => { calls++; });
  await search('problème inconnu', {});
  await search('problème inconnu', { visibleMenuKeys: [] });
  await search('problème inconnu', access, { enabled: false });
  await search('a', access);
  assert.equal(calls, 0);
});

test('failures are surfaced and retryable, aborted responses are not cached', async () => {
  let calls = 0;
  const search = createProblemSearch(async () => {
    if (++calls === 1) throw new Error('Service unavailable');
    return { recommendations: [{ id: 'risks', score: 100 }] };
  });
  await assert.rejects(search('situation inexpliquée', access), /Service unavailable/);
  assert.equal((await search('situation inexpliquée', access))[0].id, 'risks');
  const controller = new AbortController();
  const cancelled = createProblemSearch(async () => {
    controller.abort();
    return { recommendations: [{ id: 'risks', score: 100 }] };
  });
  assert.deepEqual(await cancelled('situation inexpliquée', access, { signal: controller.signal }), []);
});
