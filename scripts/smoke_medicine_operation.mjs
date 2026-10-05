// .697 route exercise: the founder's own production draw (Too Little Resolve in Discipline) through the shared reader — does the medicine instantiate inside the question?
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handingReading } = await import('../lib/externalReading.js');
const res = await handingReading({ question: 'Why do I keep second guessing myself?', context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'plain', requestId: null }, [{ transient: 28, position: 9, status: 3 }]);
const it = res.interpretation; console.log('flags:', (it.flags || []).join(',') || 'none'); console.log('\nGIST:', it.gist); console.log('\nMEDICINE:', it.medicine); console.log('\nQUESTION:', it.question);
