// .712 route exercise: one real opening per persona through the shared reader (the API/MCP door) — voice out, flags, judge, fallbacks
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handingReading } = await import('../lib/externalReading.js');
for (const v of ['friend', 'coach', 'storyteller', 'mystic']) {
  const res = await handingReading({ question: 'Why do I keep second guessing myself?', context: '', cardCount: 1, mode: 'discover', fast: true, voice: v, requestId: null }, [{ transient: 28, position: 9, status: 3 }]);
  const it = res.interpretation; const glass = [it.gist, it.text].join(' ');
  console.log(`\n== ${v} → voice out: ${it.voice || '?'} · flags: ${(it.flags || []).join(',') || '—'} · judge: ${it.medicineJudge?.first || '—'} · persona fallback: ${it.personaFallback ? JSON.stringify(it.personaFallback) : '—'} · person fallback: ${it.personFallback ? 'yes' : '—'}`);
  console.log('   ' + String(it.gist || '').slice(0, 220));
  console.log('   map words on glass:', /\b(signature|seat|medicine|Too Little|Too Much|Unacknowledged|Resolve|Discipline)\b/.test(glass) ? 'PRESENT' : 'none');
}
