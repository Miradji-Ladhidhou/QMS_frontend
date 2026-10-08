import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let ExportMenu;
let FolderTile;
const action = () => {};

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  ExportMenu = (await server.ssrLoadModule('/src/components/ExportMenu.jsx')).default;
  FolderTile = (await server.ssrLoadModule('/src/components/FolderTile.jsx')).default;
});

after(async () => {
  await server?.close();
});

test('closed export menu announces only its available formats', () => {
  const html = renderToStaticMarkup(createElement(ExportMenu, {
    onExportPdf: action,
    onExportXlsx: action,
  }));
  assert.match(html, /PDF · Excel/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /CSV|Word|Drive/);
  const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(descriptionId);
  assert.ok(html.includes(`<p id="${descriptionId}"`));
});

test('closed export menu announces every supported format without opening it', () => {
  const html = renderToStaticMarkup(createElement(ExportMenu, {
    onExportCsv: action,
    onExportPdf: action,
    onExportXlsx: action,
    onExportWord: action,
    onExportDrive: action,
    disabled: true,
  }));
  assert.match(html, /CSV · PDF · Excel · Word · Drive/);
  assert.match(html, /disabled=""/);
});

test('folder options have a visible label and closed state for managers', () => {
  const html = renderToStaticMarkup(createElement(FolderTile, {
    folder: { name: 'Qualité' },
    canManage: true,
    onOpen: action,
    onRename: action,
  }));
  assert.match(html, />Options<\/button>/);
  assert.match(html, /aria-expanded="false"/);
});

test('folder options remain absent without management permission or actions', () => {
  for (const props of [
    { canManage: false, onRename: action },
    { canManage: true },
  ]) {
    const html = renderToStaticMarkup(createElement(FolderTile, {
      folder: { name: 'Qualité' },
      onOpen: action,
      ...props,
    }));
    assert.doesNotMatch(html, /Options|Actions sur le dossier/);
  }
});
