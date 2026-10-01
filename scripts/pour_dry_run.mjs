// A dry run of the assembler: build one authoring package and one read-plan with no model call. Run: npx tsx scripts/pour_dry_run.mjs [sig] [pos]
import fs from 'node:fs';
import DEFS from '../lib/data/nirmanakaya_78_definitions.json';
import { authoringPackage, readPlan, planBlock } from '../lib/pour/assemble.js';
const sig = Number(process.argv[2] ?? 53), pos = Number(process.argv[3] ?? 1);   // Stewardship in Will — the founder's own reading from the night of the 29th
const ex = fs.existsSync('data/pour/exemplars_worked_cells.md') ? fs.readFileSync('data/pour/exemplars_worked_cells.md', 'utf8') : '';
const pkg = authoringPackage(sig, pos, DEFS, { exemplars: ex });
const w = (t) => t.split(/\s+/).filter(Boolean).length;
console.log(`package for ${pkg.meta.signature} in ${pkg.meta.seat}: system ${w(pkg.system)} words, message ${w(pkg.message)} words; partners:`, JSON.stringify(pkg.meta.partners));
const out = process.argv[4]; if (out) { fs.writeFileSync(out, `=== SYSTEM ===\n${pkg.system}\n\n=== MESSAGE ===\n${pkg.message}\n`); console.log('wrote', out); }
const plan = readPlan({ transient: sig, position: pos, status: 4 }, DEFS, () => null, { question: 'Am I overworking Nirmanakaya?' });
console.log('\n' + planBlock(plan));
