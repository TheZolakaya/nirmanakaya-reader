// THE PROMPT INVENTORY (2026-09-30, for the Handing revision): every paragraph the EZ Reader is handed,
// with where it lives, when it entered the repo (git), how many commands it carries, and a first-guess bin.
// Run: npx tsx scripts/prompt_inventory.mjs > out.tsv
import { execSync } from 'node:child_process';
import { BASE_SYSTEM } from '../lib/prompts.js';
import { EZ_RULES, VOICES, ezSystem } from '../lib/ezPrompts.js';

const words = (t) => t.split(/\s+/).filter(Boolean).length;
const neg = (t) => (t.match(/\b(never|do not|don't|not once|must|always|only|forbid|refuse|zero exceptions|hard rule)\b/gi) || []).length;
const paraKey = (p) => p.replace(/\s+/g, ' ').trim().slice(0, 60).toLowerCase();
const ezKeys = new Set(EZ_RULES.split(/\n\n+/).map(paraKey).filter((k) => k.length >= 40));
const sys = ezSystem(BASE_SYSTEM, 'plain');
const paras = sys.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
const where = (p) => (ezKeys.has(paraKey(p)) ? 'ezPrompts:EZ_RULES' : VOICES.plain.rules.includes(p.slice(0, 80)) ? 'ezPrompts:VOICES.plain' : BASE_SYSTEM.includes(p.slice(0, 80)) ? 'prompts:BASE_SYSTEM' : '?');
// a distinctive slice for git -S: the first 48 characters of the paragraph's first line, without quotes that break the shell
const slice = (p) => p.split('\n')[0].replace(/["'`$\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
const born = (p) => {
  const s = slice(p); if (s.length < 20) return { date: '', subject: '' };
  try {
    const out = execSync(`git log --format=%ad%x09%s --date=short -S"${s}" -- lib/prompts.js lib/ezPrompts.js`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').filter(Boolean);
    const last = out[out.length - 1] || ''; const [date, subject] = last.split('\t');
    return { date: date || '', subject: (subject || '').slice(0, 70) };
  } catch { return { date: '', subject: '' }; }
};
const bin = (p) => {
  if (/^(First|Second|Third|Fourth|Fifth), |THE CROSSING, FOR THE READER|Why this comes first|THE READER'S OWN CARE|THE PERSON'S WELLBEING/i.test(p)) return 'seat';
  if (/pet names|terms of endearment/i.test(p)) return 'scar';
  if (/json|"reader"|chips|reflect|forge|gist|field|\b\d+ to \d+ words|under \d+ words|Respond with ONLY/i.test(p)) return 'craft';
  if (/record|Rebalancer|partner|reduction|status|Too Much|Too Little|Unacknowledged|Balanced|house|seat|position|archetype|Bound|Ambassador|Agent/i.test(p)) return 'map';
  if (neg(p) >= 2) return 'manner';
  return 'other';
};
console.log(['#', 'where', 'bin', 'words', 'cmds', 'born', 'commit', 'opening'].join('\t'));
paras.forEach((p, i) => {
  const b = born(p);
  console.log([i + 1, where(p), bin(p), words(p), neg(p), b.date, b.subject, p.replace(/\s+/g, ' ').slice(0, 110)].join('\t'));
});
console.error(`paragraphs ${paras.length}, words ${words(sys)}`);
