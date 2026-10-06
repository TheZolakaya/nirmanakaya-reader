// .710 route exercise: Unacknowledged Breakthrough in a seat, the founder-shaped question — does the opening still say "you are calling it a collapse"
// or "the vow"? One real call through the shared reader (plain), read back.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handingReading } = await import('../lib/externalReading.js');
const res = await handingReading({ question: "What's the next real step on Nirmanakaya this week?", context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'plain', requestId: null }, [{ transient: 16, position: 4, status: 4 }]);
const it = res.interpretation; const glass = [it.gist, it.text, it.medicine, it.question].join('\n\n');
console.log('flags:', (it.flags || []).join(',') || 'none'); console.log(glass);
console.log('\nasserted "calling it / you credit / vow":', /\b(you(?:'re| are) calling|you call it|you credit|credit it to|\bvow\b)/i.test(glass) ? 'PRESENT' : 'none');
