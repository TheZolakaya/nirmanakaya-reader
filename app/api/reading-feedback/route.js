// app/api/reading-feedback/route.js — BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02). Signed in only.
//   POST { readingId, verdict: 'landed'|'partly'|'not_for_me', text? } → { feedback }   (the caller's own reading only; a second tap updates)
//   GET  ?readingId=…                                                → { feedback }   (the caller's own row, or null)
// The version and the prompt set are stamped here, never taken from the request. No model reads the feedback.
import { getAuthUser } from '../../../lib/requireUser.js';
import { ledger } from '../../../lib/externalReading.js';
import { VERSION } from '../../../lib/version.js';
import { PROMPT_SET_NAMES } from '../../../lib/promptSets.js';
import { handleFeedbackPost, handleFeedbackGet } from '../../../lib/readingFeedback.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return handleFeedbackPost(request, { getUser: getAuthUser, db: ledger(), version: VERSION, setNames: PROMPT_SET_NAMES });
}

export async function GET(request) {
  return handleFeedbackGet(request, { getUser: getAuthUser, db: ledger() });
}
