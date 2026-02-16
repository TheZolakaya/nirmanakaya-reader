
// scripts/verify_prompt_order.js
// Verifies:
// 1. Static blocks come BEFORE Dynamic blocks.
// 2. [DEEP] definitions come BEFORE [SURFACE] definitions.

import { buildSystemPrompt, USER_LEVELS } from '../lib/promptBuilder.js';
import { BASE_SYSTEM } from '../lib/prompts.js';

// Mock options
const options = {
    spreadType: 'discover',
    locusSubjects: ['VERIFICATION_SUBJECT'] // Distinct string to search for
};

console.log('Generating Prompt for Verification...');
const prompt = buildSystemPrompt(USER_LEVELS.MASTER, options);

// === CHECK 1: CACHE ORDER ===
// We expect BASE_SYSTEM (static) to be BEFORE 'VERIFICATION_SUBJECT' (dynamic)
const baseSystemIndex = prompt.indexOf('You are the Nirmanakaya Reader'); // Known string in BASE_SYSTEM
const locusIndex = prompt.indexOf('VERIFICATION_SUBJECT');

console.log('\n--- CHECK 1: CACHE OPTIMIZATION ---');
if (baseSystemIndex < locusIndex) {
    console.log('✅ PASS: BASE_SYSTEM (Static) appears BEFORE LocusInjection (Dynamic)');
    console.log(`   Base System Index: ${baseSystemIndex}`);
    console.log(`   Locus Subject Index: ${locusIndex}`);
} else {
    console.log('❌ FAIL: Dynamic Locus appears before Static System!');
}

// === CHECK 2: DEEP FIRST LOGIC ===
// We expect '[LETTER:DEEP]' to be BEFORE '[LETTER:SURFACE]'
const deepIndex = prompt.indexOf('[LETTER:DEEP]');
const surfaceIndex = prompt.indexOf('[LETTER:SURFACE]');
const deepCardIndex = prompt.indexOf('[CARD:N:DEEP]');
const surfaceCardIndex = prompt.indexOf('[CARD:N:SURFACE]');

console.log('\n--- CHECK 2: DEEP FIRST LOGIC ---');
if (deepIndex < surfaceIndex) {
    console.log('✅ PASS: [LETTER:DEEP] appears BEFORE [LETTER:SURFACE]');
    console.log(`   Deep Index: ${deepIndex}`);
    console.log(`   Surface Index: ${surfaceIndex}`);
} else {
    console.log('❌ FAIL: Surface Letter appears before Deep Letter!');
}

if (deepCardIndex < surfaceCardIndex) {
    console.log('✅ PASS: [CARD:N:DEEP] appears BEFORE [CARD:N:SURFACE]');
} else {
    console.log('❌ FAIL: Surface Card appears before Deep Card!');
}

console.log('\n--- VERIFICATION COMPLETE ---');
