// app/api/admin/feedback/route.js — BRIEF 08 item 1, THE FEEDBACK DOOR (2026-11-02): the Feedback tab's server side. Admin only (requireAdmin).
//   GET ?version=&verdict=             → { rows: [{ id, reading_id, user_id, verdict, text, version, prompt_set, created_at }], versions }  newest first
//   GET ?version=&verdict=&format=csv  → the same filtered list as text/csv
// The person's words are returned as they gave them; nothing here calls a model.
import { requireAdmin } from '../../../../lib/adminAuth.js';
import { ledger } from '../../../../lib/externalReading.js';
import { handleAdminFeedbackGet } from '../../../../lib/readingFeedback.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return handleAdminFeedbackGet(request, { requireAdmin, db: ledger() });
}
