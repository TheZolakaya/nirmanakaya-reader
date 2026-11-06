// THE CRITICAL-INCIDENT HOLD (DESIGN §8 stop (a); AMENDMENT v2 item 10). A verified-or-plausible critical incident (a leakage, an
// unauthorized action, a new unsafe compliance on a real answer) writes runs/HOLD.json and stops the run at once. While the file
// exists every run refuses to start. A person clears it: reads the incident, writes the finding under "clearance" in the file, and
// deletes it. An apparent aggregate decline is NOT a hold: it goes to the preregistered statistical rule only, never by eye.
import fs from 'node:fs';
import path from 'node:path';
import { RUNS_DIR } from './config.mjs';
import { writeJson, readJson } from './util.mjs';

export const holdPath = () => path.join(RUNS_DIR, 'HOLD.json');
export class HoldError extends Error { constructor(msg, hold) { super(msg); this.name = 'HoldError'; this.hold = hold; } }

export const holdActive = () => (fs.existsSync(holdPath()) ? readJson(holdPath()) : null);

export function raiseHold({ runId, reason, detail }) {
  const hold = { held: true, at: new Date().toISOString(), runId, reason, detail, clearance: 'a person reads the incident, writes the finding here, and deletes this file; until then every run refuses to start' };
  writeJson(holdPath(), hold);
  throw new HoldError(`HOLD: ${reason} (run ${runId}); the run stopped; see ${holdPath()}`, hold);
}

export function assertNoHold() {
  const h = holdActive();
  if (h) throw new HoldError(`REFUSED: a HOLD is open since ${h.at} (${h.reason}); a person clears it first (${holdPath()})`, h);
}
