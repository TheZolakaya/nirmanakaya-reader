// Write the ruled noun field (lib/nounField.js FIELD) into the 78-definitions JSON as `field`, the canon's home for it.
import fs from 'node:fs';
import { FIELD } from '../lib/nounField.js';
const p = 'lib/data/nirmanakaya_78_definitions.json'; const D = JSON.parse(fs.readFileSync(p, 'utf8'));
D.field = { _note: 'THE NOUN FIELD (5 x 5), ruled 2026-10-04 (NOUN_FIELD_5x5_Merged_Council_Cells_For_True_2026-10-04.md). field[seatHouse][signatureHouse] = [Intent[], Cognition[], Resonance[], Structure[]]: "the <signature house> of <seat house>". Channel is a selector inside the cell; the record hands over three or four nouns, never a cell.', ...FIELD };
fs.writeFileSync(p, JSON.stringify(D, null, 2) + '\n'); console.log('field block written:', Object.keys(FIELD).length, 'seat houses');
