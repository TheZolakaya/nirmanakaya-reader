// .718 THE ONE-SENTENCE OPERATION REPAIR, for the page (the API/MCP door runs it inside lib/externalReading.js). The page's persona guard calls
// this just before its Plain fallback when the ONLY fault left after the re-ask is a copied operation line. Here: rewrite only the sentences
// holding the copied words (lib/operationRepair.js) and, when the medicine box was touched, ask the medicine judge. The page re-checks the
// whole reply with its own guard and keeps the repair only if it is clean and medOk. OP_REPAIR=0 turns it off.
import { createClient } from '@supabase/supabase-js';
import { repairOperation } from '../../../lib/operationRepair.js';
import { judgeMedicineAct } from '../../../lib/bakeoff/medicineJudge.js';
import { buildKernel } from '../../../lib/kernel.js';
import DEFS from '../../../lib/data/nirmanakaya_78_definitions.json';

export const dynamic = 'force-dynamic';

async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user }, error } = await anon.auth.getUser(authHeader.slice(7));
  return error || !user ? null : user;
}

export async function POST(request) {
  if (process.env.OP_REPAIR === '0') return Response.json({ disabled: true });
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { obj, faults, draws } = await request.json();
    if (!obj || !Array.isArray(faults)) return Response.json({ error: 'obj and faults are required' }, { status: 400 });
    const fields = { gist: String(obj.gist || ''), reader: String(obj.reader || ''), medicine: String(obj.medicine || ''), question: String(obj.question || '') };
    const rep = await repairOperation(fields, faults.map((f) => ({ code: String(f?.code || ''), detail: String(f?.detail || '') })));
    if (!rep) return Response.json({ skipped: true });
    if (rep.located === false) return Response.json({ located: false });
    let medOk = true;
    if (rep.repaired.some((x) => x.field === 'medicine') && Array.isArray(draws) && draws.length) {
      const partners = draws.map((d) => { try { return buildKernel({ transient: Number(d.transient), position: Number(d.position), status: Number(d.status) }, DEFS)?.partnerId ?? null; } catch { return null; } });
      if (partners[0] != null) { const j = await judgeMedicineAct({ medicine: rep.obj.medicine, partnerId: partners[0], otherPartnerIds: partners.slice(1) }); medOk = j.verdict === 'PASS'; }
    }
    return Response.json({ obj: rep.obj, repaired: rep.repaired, medOk });
  } catch (e) {
    console.error('[op-repair]', e?.message);
    return Response.json({ error: 'repair failed' }, { status: 500 });
  }
}
