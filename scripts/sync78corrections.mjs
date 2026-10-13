// sync78corrections.mjs — re-sync ONLY the `corrections` field of every signature in lib/data/nirmanakaya_78_definitions.json
// from the live library (lib/corrections.js), preserving every other byte of the file's content (the hand-added `field` and `groups`
// blocks, the Unacknowledged texts, the medicine-sweep note). Written 2026-10-13 because scripts/generate78.mjs no longer knows about
// those hand edits and a full regeneration drops them. Run: npx tsx scripts/sync78corrections.mjs
import fs from 'node:fs';
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { getFullCorrection, getComponent } = await import(R + 'lib/corrections.js');
const PATH = 'D:/NKYAWebApp/nirmanakaya-reader/lib/data/nirmanakaya_78_definitions.json';
const WIKI = 'D:/Nirmanakaya_Wiki/nirmanakaya_78_definitions.json';
const doc = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const KEY = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' };
const TYPE = { growth: 'growth', diagonal: 'diagonal', vertical: 'vertical', reduction: 'reduction' };
let changed = 0, same = 0, missing = 0; const changes = [];
for (let id = 0; id <= 77; id++) {
  const sig = doc.signatures[id]; if (!sig) { missing++; continue; }
  const next = {};
  for (const status of [1, 2, 3, 4]) {
    const live = getFullCorrection(id, status); if (!live) continue;
    const targetId = live.isSelf ? id : (live.targetAgentId ?? live.targetId ?? live.target);
    if (targetId == null) continue;
    const t = getComponent(targetId);
    next[KEY[status]] = { correctionType: TYPE[live.type] ?? live.type, targetId, targetName: t?.name ?? null, targetType: t?.type ?? null, targetTraditional: t?.traditional ?? null, isSelf: !!live.isSelf || targetId === id };
  }
  const before = JSON.stringify(sig.corrections ?? null), after = JSON.stringify(next);
  if (before !== after) { changed++; for (const k of Object.keys(next)) if (JSON.stringify(sig.corrections?.[k]) !== JSON.stringify(next[k])) changes.push(`${sig.traditional ?? sig.name} ${k}: ${sig.corrections?.[k]?.targetTraditional ?? sig.corrections?.[k]?.targetName ?? '—'} → ${next[k].targetTraditional ?? next[k].targetName}`); sig.corrections = next; } else same++;
}
doc._meta = { ...(doc._meta ?? {}), correctionsSynced: { at: new Date().toISOString().slice(0, 10), from: 'lib/corrections.js (BOUND_GROWTH_TARGETS fixed 2026-10-12 to the flip rule; the 2026-10-02 Gestalt-bound ruling)', changedSignatures: changed } };
fs.writeFileSync(PATH, JSON.stringify(doc, null, 2) + '\n');
try { fs.copyFileSync(PATH, WIKI); } catch (e) { console.log('wiki copy not written:', e.message); }
console.log(`corrections synced: ${changed} signatures changed, ${same} unchanged, ${missing} missing`);
console.log(changes.join('\n'));
console.log('top-level keys preserved:', Object.keys(doc).join(','));
