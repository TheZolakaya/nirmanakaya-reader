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
 *   1. Cleans Reader's public/wiki/
 *   2. Runs quartz build in the wiki repo
 *   3. Copies the build output back into Reader's public/wiki/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const wikiRoot = path.resolve(__dirname, '../../../Nirmanakaya_Wiki/quartz');
const wikiOut = path.resolve(__dirname, '../public/wiki');

if (!fs.existsSync(wikiRoot)) {
  console.error(`Wiki Quartz project not found at ${wikiRoot}`);
  console.error('Adjust the path in scripts/build-wiki.js if your wiki lives elsewhere.');
  process.exit(1);
}

console.log(`Cleaning ${wikiOut} ...`);
fs.rmSync(wikiOut, { recursive: true, force: true });

console.log(`Running quartz build in ${wikiRoot} ...`);
execSync('npx quartz build', { cwd: wikiRoot, stdio: 'inherit' });

console.log(`Copying ${wikiRoot}/public -> ${wikiOut} ...`);
fs.cpSync(path.join(wikiRoot, 'public'), wikiOut, { recursive: true });

console.log('\nDone. Commit changes under public/wiki/ and push to deploy.');
