/**
 * One-shot: rebuild the wiki and stage it in public/wiki/.
 *
 * Usage:
 *   npm run build:wiki
 *
 * After running, commit the changes in public/wiki/ and push to deploy.
 *
 * Wiki source lives in D:\Nirmanakaya_Wiki\ (sibling of D:\NKYAWebApp\).
 * This script:
 *   0. Syncs quartz/content/canon/ FROM the corpus (the corpus is authoritative)
 *   1. Cleans Reader's public/wiki/
 *   2. Runs quartz build in the wiki repo
 *   3. Copies the build output back into Reader's public/wiki/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const wikiRoot = path.resolve(__dirname, '../../../Nirmanakaya_Wiki/quartz');
const wikiOut = path.resolve(__dirname, '../public/wiki');
const corpusCanon = path.resolve(
  __dirname,
  '../../../Nirmanakaya_Book_Final_0/Nirmanakaya_Final/canon'
);
const wikiCanon = path.join(wikiRoot, 'content', 'canon');
const canonManifestPath = path.join(__dirname, 'wiki-canon-manifest.json');

if (!fs.existsSync(wikiRoot)) {
  console.error(`Wiki Quartz project not found at ${wikiRoot}`);
  console.error('Adjust the path in scripts/build-wiki.js if your wiki lives elsewhere.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// STEP 0 — Regenerate quartz/content/canon/ from the corpus.
//
// History: content/canon/ used to be a HAND-MAINTAINED mirror of ~67 corpus
// canon files. It drifted in BOTH directions — most copies froze at a
// 2026-06-30 baseline and missed later corpus corrections, while ~16 archetype
// files accumulated real new writing that existed nowhere else. Reconciling
// that by hand was a one-off rescue; this step makes it structurally
// impossible to happen again.
//
// The corpus (D:\Nirmanakaya_Book_Final_0\Nirmanakaya_Final\canon\) is the sole
// authority. content/canon/ is GENERATED OUTPUT. Never hand-edit it — edit the
// corpus file and re-run `npm run build:wiki`.
//
// Which files get published is curated, not "everything": scripts/wiki-canon-manifest.json
// holds the explicit allow-list. This keeps non-public canon (governance/,
// corrections/, drafts) off the public site. To publish another canon doc,
// add its corpus-relative path to that manifest.
// ---------------------------------------------------------------------------
console.log(`Syncing canon: ${corpusCanon} -> ${wikiCanon} ...`);
if (!fs.existsSync(corpusCanon)) {
  console.error(`Corpus canon not found at ${corpusCanon}`);
  console.error('The wiki canon mirror is generated from the corpus and cannot be built without it.');
  process.exit(1);
}

const canonManifest = JSON.parse(fs.readFileSync(canonManifestPath, 'utf8'));
const manifestFiles = canonManifest.files;
const manifestSet = new Set(manifestFiles.map((f) => f.replace(/\\/g, '/')));

const GENERATED_README = 'README_GENERATED.md';
const GENERATED_BANNER = `---
title: "canon/ is generated - do not edit"
draft: true
---

# GENERATED DIRECTORY - DO NOT HAND-EDIT

Every \`.md\` file under \`quartz/content/canon/\` is **generated output**, copied
verbatim from the corpus by \`scripts/build-wiki.js\` (step 0) in the Reader repo
each time \`npm run build:wiki\` runs.

**Source of truth:** \`D:\\Nirmanakaya_Book_Final_0\\Nirmanakaya_Final\\canon\\\`

Edits made directly in this directory will be **silently overwritten** on the
next wiki build. To change a canon page, edit the corpus file and rebuild.

Which files land here is curated by
\`D:\\NKYAWebApp\\nirmanakaya-reader\\scripts\\wiki-canon-manifest.json\`.
Add a corpus-relative path there to publish another canon document.

This file carries \`draft: true\`, so Quartz's RemoveDrafts filter keeps it off
the public site.
`;

let canonWritten = 0;
let canonUnchanged = 0;
const canonMissing = [];

for (const rel of manifestFiles) {
  const src = path.join(corpusCanon, rel);
  const dest = path.join(wikiCanon, rel);
  if (!fs.existsSync(src)) {
    canonMissing.push(rel);
    continue;
  }
  const content = fs.readFileSync(src, 'utf8');
  const existing = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
  if (existing === content) {
    canonUnchanged++;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
  canonWritten++;
}

fs.mkdirSync(wikiCanon, { recursive: true });
fs.writeFileSync(path.join(wikiCanon, GENERATED_README), GENERATED_BANNER, 'utf8');

// Anything in the generated directory that the manifest does not account for is
// stale (a removed/renamed corpus file, or a hand-added page). Drop it, so the
// directory is a faithful projection of the manifest and never accretes drift.
let canonRemoved = 0;
function pruneCanon(dir, rel = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      pruneCanon(full, relPath);
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } else if (entry.name.endsWith('.md') && entry.name !== GENERATED_README) {
      if (!manifestSet.has(relPath)) {
        console.warn(`  removing unmanifested canon page: canon/${relPath}`);
        fs.rmSync(full);
        canonRemoved++;
      }
    }
  }
}
pruneCanon(wikiCanon);

console.log(
  `Canon sync: ${canonWritten} updated, ${canonUnchanged} already current, ` +
    `${canonRemoved} removed, ${manifestFiles.length} in manifest.`
);
if (canonMissing.length) {
  console.error('\nERROR: manifest lists canon files that do not exist in the corpus:');
  for (const rel of canonMissing) console.error(`  - ${rel}`);
  console.error('Fix scripts/wiki-canon-manifest.json (or restore the corpus file) and re-run.');
  process.exit(1);
}

console.log(`Cleaning ${wikiOut} ...`);
fs.rmSync(wikiOut, { recursive: true, force: true });

console.log(`Running quartz build in ${wikiRoot} ...`);
execSync('npx quartz build', { cwd: wikiRoot, stdio: 'inherit' });

console.log(`Copying ${wikiRoot}/public -> ${wikiOut} ...`);
fs.cpSync(path.join(wikiRoot, 'public'), wikiOut, { recursive: true });

// Inject <base href="..."> ONLY into directory index.html files.
//
// Why: Next.js with trailingSlash:false serves /wiki/canon (no trailing slash)
// for the file public/wiki/canon/index.html. At that URL, the browser resolves
// relative refs like "../index.css" against /wiki/canon → strips last segment
// → "/wiki/" → applies "../" → "/index.css" (404). The <base> tag fixes that
// by giving the browser the correct directory context.
//
// Crucially, we must NOT inject <base> into non-index pages. Quartz emits
// paths like "../../index.css" and "../../canon/archetypes/02-wisdom" from
// nested pages. With a /wiki/ base, those "../.." segments climb above /wiki/
// and break (you'd see /canon/archetypes/02-wisdom → 404). Without <base>,
// the browser resolves them against the actual page URL and they land
// correctly inside /wiki/.
console.log('Injecting <base href> into directory index.html files...');
let baseInjected = 0;
function walkInject(dir, relFromWikiRoot = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = relFromWikiRoot ? `${relFromWikiRoot}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walkInject(fullPath, relPath);
    } else if (entry.name === 'index.html') {
      const baseHref = relFromWikiRoot ? `/wiki/${relFromWikiRoot}/` : '/wiki/';
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('<base ')) continue;
      const updated = content.replace(/<head([^>]*)>/, `<head$1><base href="${baseHref}">`);
      if (updated !== content) {
        fs.writeFileSync(fullPath, updated);
        baseInjected++;
      }
    }
  }
}
walkInject(wikiOut);
console.log(`Injected <base> into ${baseInjected} index.html files.`);

console.log('\nDone. Commit changes under public/wiki/ and push to deploy.');
