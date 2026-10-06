// .718 a copied run straddling a sentence break is located and repaired as one unit; a reply without the copy reports located:false
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { repairOperation } = await import('../lib/operationRepair.js');
const F = [{ code: 'operation', detail: '"one concrete piece of help…" is the record\'s own operation line for Support, quoted' }];
const r = await repairOperation({ reader: 'You start small. Give one concrete piece. Of help and finish it, then stop.', medicine: '', gist: '', question: '' }, F);
console.log('straddle:', JSON.stringify(r?.repaired)); const { operationFlags } = await import('../lib/bakeoff/lint.js'); console.log('straddle after (want 0):', operationFlags(r?.obj?.reader || '', [{ transient: 26, position: 3, status: 3 }]).length);
console.log('absent:', JSON.stringify(await repairOperation({ reader: 'Nothing copied here at all.', medicine: '', gist: '', question: '' }, F)));
