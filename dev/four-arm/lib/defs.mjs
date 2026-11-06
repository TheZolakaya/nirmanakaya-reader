// The repo root and the 78 definitions, READ ONLY (lib/data/nirmanakaya_78_definitions.json is never written by the harness),
// injected into lib/recognition.js the way lib/kernel.js takes it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(HARNESS, '..', '..');
export const DEFS_PATH = path.join(REPO, 'lib', 'data', 'nirmanakaya_78_definitions.json');
export const DEFS = JSON.parse(fs.readFileSync(DEFS_PATH, 'utf8'));
