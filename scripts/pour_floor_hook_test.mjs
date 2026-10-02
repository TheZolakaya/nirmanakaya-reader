// The floor hook, tested without a server: a two-message conversation with one draw gets the floor block on its last user
// message when enabled, nothing when disabled or on a talk turn. Run: npx tsx scripts/pour_floor_hook_test.mjs
import { appendFloor } from '../lib/pour/floorHook.js';
import { lookupCell, snapshotManifest } from '../lib/pour/library.js';
const m = snapshotManifest(); console.log('snapshot:', m ? `${m.cells} cells from set ${m.set}, cut ${m.cut}` : 'none');
// find a draw the snapshot has
let draw = null; outer: for (let sig = 0; sig < 78; sig++) for (let pos = 0; pos < 22; pos++) for (const st of [2, 3, 4]) { if (lookupCell(sig, pos, st)) { draw = { transient: sig, position: pos, status: st }; break outer; } }
if (!draw) { console.log('no cell in the snapshot yet'); process.exit(0); }
const messages = [{ role: 'user', content: 'QUESTION: "Should I ask my sister to pay me back?"\n\nTHE DRAW: …' }];
const off = appendFloor(messages, [draw], { enabled: false });
const talk = appendFloor(messages, [draw], { enabled: true, turn: 'talk' });
const on = appendFloor(messages, [draw], { enabled: true, turn: 'card' });
console.log('disabled → floors', off.floors, '· talk turn → floors', talk.floors, '· card turn → floors', on.floors);
console.log('appended block head:', on.messages[0].content.split('\n\n').slice(2, 4).join(' | ').slice(0, 260));
process.exit(on.floors === 1 && off.floors === 0 && talk.floors === 0 && on.messages[0].content.includes('where this sits in the whole self') ? 0 : 1);
