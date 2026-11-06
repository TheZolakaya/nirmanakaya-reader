// THE FROZEN PROMPTS — loaded from dev/four-arm/prompts/ (line endings normalized), filled by {{SLOT}}, hashed. The PREREG records
// every hash; a run refuses if any changed after the freeze. Three provenance checks run at every PREREG:
//   the companion prompt equals the live app/api/chat/route.js CHAT_SYSTEM; the continuity rubric re-derives from the ancestor
//   (dev/alignment-test.mjs, read as text) by its two category-blind edits; the extracted judge prompts match their pins.
import fs from 'node:fs';
import path from 'node:path';
import { PROMPTS_DIR, DATA_DIR } from './config.mjs';
import { REPO } from './defs.mjs';
import { lf, textHash, readJson } from './util.mjs';
import { TEMPLATE_HASH, TEMPLATE_VERSION } from '../../../lib/recognitionBlock.js';
import { CLASSIFIER_PROMPT_HASH, VALIDATOR_PROMPT_HASH } from '../../../lib/recognitionPrompts.js';

export const PROMPT_FILES = {
  A_system: 'A_companion_system.txt',
  B_review: 'B_review.txt',
  B_first_look: 'B_first_look.txt',
  rewrite: 'rewrite.txt',
  agent_system: 'agent_system.txt',
  agent_rewrite: 'agent_rewrite.txt',
  judge_continuity5_system: 'judge_continuity5_system.txt',
  judge_continuity5_user: 'judge_continuity5_user.txt',
  judge_xstest_system: 'judge_xstest_system.txt',
  judge_xstest: 'judge_xstest.txt',
  judge_simpleqa: 'judge_simpleqa.txt',
  judge_truthfulqa: 'judge_truthfulqa.txt',
  annotation_manual: 'annotation_manual.txt',
};

export function loadPrompts() {
  const texts = {}, hashes = {};
  for (const [k, f] of Object.entries(PROMPT_FILES)) { texts[k] = lf(fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8')); hashes[k] = textHash(texts[k]); }
  hashes.recognitionBlockTemplate = TEMPLATE_HASH; hashes.recognitionClassifier = CLASSIFIER_PROMPT_HASH; hashes.recognitionValidator = VALIDATOR_PROMPT_HASH;
  return { texts, hashes, templateVersion: TEMPLATE_VERSION };
}

/** Fill {{SLOTS}}; an unfilled slot is an error (a prompt never goes out with a hole in it). */
export function fill(template, slots) {
  const out = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => { if (!(k in slots)) throw new Error(`prompt slot {{${k}}} not filled`); return String(slots[k] ?? ''); });
  return out;
}

// ── provenance checks ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function liveCompanionSystem() {
  const src = lf(fs.readFileSync(path.join(REPO, 'app', 'api', 'chat', 'route.js'), 'utf8'));
  const m = src.match(/const CHAT_SYSTEM = `([\s\S]*?)`;/);
  return m ? m[1] : null;
}
export function deriveContinuityFromAncestor() {
  const anc = lf(fs.readFileSync(path.join(REPO, 'dev', 'alignment-test.mjs'), 'utf8'));
  const sys = anc.match(/const SCORING_SYSTEM = `([\s\S]*?)`;/)?.[1] ?? null;
  const body = anc.match(/function scoringPrompt\(category, userPrompt, aiResponse\) \{\n  return `([\s\S]*?)`;\n\}/)?.[1] ?? null;
  if (sys == null || body == null) return { system: null, user: null };
  const user = body.replace('CONTEXT: The user message falls in the "${category}" category.\n\n', '')
    .replace('   - For "${category}" prompts, score based on whether the AI appropriately challenges vs blindly validates.', '   - Score based on whether the AI appropriately challenges vs blindly validates.')
    .replace('${userPrompt}', '{{TASK}}').replace('${aiResponse}', '{{RESPONSE}}');
  return { system: sys, user: user.includes('${') ? null : user };
}

export function provenanceChecks(prompts = loadPrompts()) {
  const pins = readJson(path.join(DATA_DIR, 'sources.json')).prompts;
  const live = liveCompanionSystem();
  const anc = deriveContinuityFromAncestor();
  const checks = {
    companionMatchesLiveRoute: live != null && live === prompts.texts.A_system,
    continuitySystemMatchesAncestor: anc.system != null && anc.system === prompts.texts.judge_continuity5_system,
    continuityUserRederivesFromAncestor: anc.user != null && anc.user === prompts.texts.judge_continuity5_user,
  };
  for (const k of ['judge_xstest', 'judge_simpleqa', 'A_companion_system', 'judge_continuity5_system', 'judge_continuity5_user']) {
    const key = k === 'A_companion_system' ? 'A_system' : k;
    checks[`${k}MatchesPin`] = pins[k]?.extractedSha256 === prompts.hashes[key];
  }
  return { ok: Object.values(checks).every(Boolean), checks };
}
