
import { parseReadingResponse } from '../lib/utils.js';

const mocks = {
    // Case 1: Perfect Order (Deep First)
    perfect: `
[LETTER:DEEP]
Letter Deep Content
[LETTER:SWIM]
Letter Swim Content
[LETTER:WADE]
Letter Wade Content
[LETTER:SURFACE]
Letter Surface Content

[SUMMARY:DEEP]
Summary Deep Content
[SUMMARY:SWIM]
Summary Swim Content
[SUMMARY:WADE]
Summary Wade Content
[SUMMARY:SURFACE]
Summary Surface Content

[CARD:1:DEEP]
Card 1 Deep Content
[CARD:1:SWIM]
Card 1 Swim Content
[CARD:1:WADE]
Card 1 Wade Content
[CARD:1:SURFACE]
Card 1 Surface Content
`,

    // Case 2: Truncated (Missing Surface/Wade)
    truncated: `
[LETTER:DEEP]
Letter Deep Content
[LETTER:SWIM]
Letter Swim Content

[CARD:1:DEEP]
Card 1 Deep Content
[CARD:1:SWIM]
Card 1 Swim Content
`,

    // Case 3: Spaces in Brackets
    spaces: `
[ CARD:1:DEEP ]
Card 1 Deep Content
[ CARD:1:SWIM ]
Card 1 Swim Content
[CARD:1:WADE]
Card 1 Wade Content
[CARD:1:SURFACE]
Card 1 Surface Content
`,

    // Case 4: Deep Missing (LLM hallucination)
    missingDeep: `
[CARD:1:SWIM]
Card 1 Swim Content
[CARD:1:WADE]
Card 1 Wade Content
[CARD:1:SURFACE]
Card 1 Surface Content
`,

    // Case 5: Deep First but Progressive Check Fails?
    // If we only check Surface/Wade, and they are missing...
    progressiveCheckFail: `
[CARD:1:DEEP]
Card 1 Deep Content
[CARD:1:SWIM]
Card 1 Swim Content
`
};

const draws = [{ position: 0, transient: 1, status: 1 }];

console.log("=== RUNNING PARSER EDGE CASES ===");

Object.entries(mocks).forEach(([name, text]) => {
    console.log(`\n--- Testing Case: ${name} ---`);
    const result = parseReadingResponse(text, draws);

    const c1 = result.cards[0];
    if (!c1) {
        console.log("❌ No cards parsed!");
        return;
    }

    console.log(`Basic Parse Success: ${!!c1}`);
    console.log(`Surface: ${c1.surface ? c1.surface.substring(0, 10) + '...' : 'NULL'}`);
    console.log(`Wade:    ${c1.wade ? c1.wade.substring(0, 10) + '...' : 'NULL'}`);
    console.log(`Swim:    ${c1.swim ? c1.swim.substring(0, 10) + '...' : 'NULL'}`);
    console.log(`Deep:    ${c1.deep ? c1.deep.substring(0, 10) + '...' : 'NULL'}`);

    if (name === 'truncated' || name === 'progressiveCheckFail') {
        if (!c1.deep) console.log("❌ FAILED: Deep content missing in truncated text.");
        else console.log("✅ SUCCESS: Deep content found despite truncation.");
    }

    if (name === 'spaces') {
        if (!c1.deep) console.log("❌ FAILED: Spaces in brackets caused failure.");
    }
});
