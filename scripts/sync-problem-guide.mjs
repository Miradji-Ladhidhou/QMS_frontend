import { copyFile, mkdir, readFile } from 'node:fs/promises';

// Deux déploiements indépendants : le serveur revalide la recherche avec la même bibliothèque.
const target = new URL('../../backend/src/lib/problemGuide/', import.meta.url);
const check = process.argv.includes('--check');
if (!check) await mkdir(target, { recursive: true });
for (const filename of ['problemGuide.js', 'problemConcepts.js']) {
  const source = new URL(`../src/lib/${filename}`, import.meta.url);
  const destination = new URL(filename, target);
  if (check) {
    const [local, server] = await Promise.all([readFile(source, 'utf8'), readFile(destination, 'utf8')]);
    if (local !== server) throw new Error(`${filename}: exécuter node frontend/scripts/sync-problem-guide.mjs`);
  } else {
    await copyFile(source, destination);
  }
}
