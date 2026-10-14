// .782 proof: toolAsked on positives and negatives (copied from the page)
const src = (await import('node:fs')).readFileSync(new URL('../app/ez/page.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('function toolAsked(text)'), src.indexOf('\n}', src.indexOf('function toolAsked(text)')) + 2);
const toolAsked = new Function(`${body}; return toolAsked;`)();
const cases = [
  ['Can you do a reflect for me on whether the research is doing double duty?', 'reflect'],
  ["Let's forge it: I will send the piece tonight", 'forge'],
  ['Please do a reflection', 'reflect'],
  ['Can you help me? I want to find it', 'find'],
  ["Let's face the dragon", 'dragon'],
  ['give me one small step', 'step'],
  ['I reflect on this a lot and it never settles', null],
  ['The forge in my dream was hot', null],
  ['Why did you say that?', null],
  ['I want to understand the medicine better', null],
];
let fail = 0; for (const [t, want] of cases) { const got = toolAsked(t); const ok = (got?.tool ?? null) === want; if (!ok) fail++; console.log(ok ? 'PASS' : 'FAIL', JSON.stringify(t).slice(0, 60), '→', JSON.stringify(got)); }
console.log(fail ? `${fail} FAILED` : 'all pass'); process.exit(fail ? 1 : 0);
