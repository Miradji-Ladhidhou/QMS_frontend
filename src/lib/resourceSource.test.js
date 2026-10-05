import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyResourceSource } from './resourceSource.js';

test('recognizes the exact official publisher domains independently of the page path', () => {
  for (const domain of ['iso.org', 'inrs.fr', 'cnil.fr', 'fao.org', 'eur-lex.europa.eu']) {
    for (const prefix of ['', 'www.']) {
      const result = classifyResourceSource(`https://${prefix}${domain}/fr/document`);
      assert.equal(result.kind, 'official');
      assert.ok(result.publisher);
      assert.ok(result.nature);
    }
  }
});

test('distinguishes private practical guides from official publishers', () => {
  assert.equal(classifyResourceSource('https://www.manager-go.com/management').kind, 'private');
  assert.equal(classifyResourceSource('https://example.com').kind, 'unverified');
});

test('never declares misleading domains or unsafe addresses official', () => {
  for (const url of [
    'https://iso.org.example.com', 'https://example.com/iso.org',
    'https://unknown.iso.org', 'https://www.www.iso.org', 'https://iso.org@evil.example',
    'https://user@iso.org', 'http://iso.org', 'https://iso.org:8443',
    'javascript:alert(1)', '/invalid', '',
  ]) {
    assert.equal(classifyResourceSource(url).kind, 'unverified', url);
  }
});
