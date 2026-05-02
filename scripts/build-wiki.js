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
