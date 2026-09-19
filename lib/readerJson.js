// lib/readerJson.js
// ONE tolerant parser for the Reader's JSON envelope, shared by the EZ page and the Bake-off.
//
// Why it exists (2026-09-19): the Bake-off's first blind run showed deepseek-flash writing a
// complete, well-escaped reading — and failing to parse, so the page printed raw JSON. The most
// likely cause is REAL LINE BREAKS inside the string values: the prompt asks for "paragraphs
// separated by blank lines" inside a JSON string, Sonnet writes them as \n\n, other models write
// actual newlines, which JSON forbids. That is a one-character-class failure. Repairing it here
// helps every model equally, so the bench stays a fair comparison and the reader gets sturdier.
//
// Order: first {...} span → strict parse → repair (fences, raw control characters inside strings,
// trailing commas) → parse again → null. Never invents content; only re-escapes what is there.

function firstObjectSpan(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  return a >= 0 && b > a ? s.slice(a, b + 1) : null;
}

// Walk the text tracking whether we are inside a string; inside one, replace raw newlines, tabs
// and carriage returns with their escapes. Outside strings nothing changes.
function escapeControlCharsInStrings(src) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { out += c + (src[i + 1] ?? ''); i += 1; continue; } // keep existing escapes intact
      if (c === '"') { inStr = false; out += c; continue; }
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { continue; }
      if (c === '\t') { out += '\\t'; continue; }
      out += c;
    } else {
      if (c === '"') inStr = true;
      out += c;
    }
  }
  return out;
}

function stripFences(s) {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
}

function dropTrailingCommas(s) {
  return s.replace(/,\s*([}\]])/g, '$1');
}

/** Parse the Reader's JSON envelope; tolerant of the common model slips. Returns an object or null. */
export function parseReaderJson(text) {
  const span = firstObjectSpan(stripFences(String(text || '')));
  if (!span) return null;
  try { return JSON.parse(span); } catch {}
  try { return JSON.parse(dropTrailingCommas(escapeControlCharsInStrings(span))); } catch {}
  return null;
}

/** True when the strict parse fails but the repaired one succeeds — the bench reports this as a flag. */
export function neededRepair(text) {
  const span = firstObjectSpan(stripFences(String(text || '')));
  if (!span) return false;
  try { JSON.parse(span); return false; } catch {}
  try { JSON.parse(dropTrailingCommas(escapeControlCharsInStrings(span))); return true; } catch { return false; }
}
