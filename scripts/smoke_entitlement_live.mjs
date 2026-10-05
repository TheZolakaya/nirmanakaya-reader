// .706 route exercise: one real opening through the shared reader with the entitlement rule in the base
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handingReading } = await import('../lib/externalReading.js');
const res = await handingReading({ question: 'How can I help coordinate a project across its collaborators without taking over decisions that belong to someone else?', context: 'I just joined the project this week.', cardCount: 1, mode: 'discover', fast: true, voice: 'plain', requestId: null }, [{ transient: 65, position: 4, status: 3 }]);
const it = res.interpretation; console.log('flags:', (it.flags || []).join(',') || 'none'); console.log('\nGIST:', it.gist); console.log('\nBODY:', it.text);
