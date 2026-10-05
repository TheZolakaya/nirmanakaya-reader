// ROUTE EXERCISE for .695: one real opening through the shared reader (the API/MCP door and the page's opening share lib/record.js) on a frozen
// draw, to prove the record change reads end to end — not a bench, one call.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handingReading } = await import('../lib/externalReading.js');
const draws = [{ transient: 12, position: 4, status: 3 }]; // Too Little Faith in Authority — an archetype with a card line and a face
const res = await handingReading({ question: 'Why can I not let go of the way the old team did things?', context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'plain', requestId: null }, draws);
const it = res.interpretation; console.log('status:', res.status, '| flags:', (it.flags || []).join(',') || 'none'); console.log('gist:', it.gist); console.log('medicine:', it.medicine);
