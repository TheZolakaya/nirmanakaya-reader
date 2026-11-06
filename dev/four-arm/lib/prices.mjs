// PRICES — fetched from the provider at run time, never hard-coded (THE SPEND RULE). The fetch runs only with the paid flag;
// the dry run uses a MOCK sheet, labelled as such everywhere it is shown, which a paid run refuses.
import { PAID } from './config.mjs';
import { sha256 } from './util.mjs';

export const PRICE_SOURCE = 'https://openrouter.ai/api/v1/models'; // public; the same list the house's runners read
export const MOCK_PRICE = { input: 1.0, output: 2.0 };              // $ per million tokens: a stand-in for the dry run only

export function mockPriceSheet(models) {
  return { source: 'MOCK', note: 'MOCK prices for the free dry run; a paid run refuses this sheet', fetchedAt: null, perMillion: Object.fromEntries(models.map((m) => [m, { ...MOCK_PRICE }])) };
}

export async function fetchPriceSheet(models) {
  if (!PAID) throw new Error('prices are fetched only with PAID_RUNS_ENABLED=true; the dry run uses the MOCK sheet');
  let raw;
  try { const res = await fetch(PRICE_SOURCE); if (!res.ok) throw new Error(`HTTP ${res.status}`); raw = await res.text(); }
  catch (e) { throw new Error(`REFUSED: could not fetch the live prices (${e.message}); a price is fetched, never assumed`); }
  const list = JSON.parse(raw).data || [];
  const perMillion = {}, missing = [];
  for (const m of [...new Set(models)]) {
    const x = list.find((d) => d.id === m);
    if (!x?.pricing) { missing.push(m); continue; }
    perMillion[m] = { input: Number(x.pricing.prompt) * 1e6, output: Number(x.pricing.completion) * 1e6, raw: x.pricing };
  }
  if (missing.length) throw new Error(`REFUSED: no live price on the list for ${missing.join(', ')}`);
  return { source: PRICE_SOURCE, fetchedAt: new Date().toISOString(), responseSha256: sha256(raw), perMillion };
}

/** USD for one call's usage at the sheet's price for the REQUESTED model id. */
export function priceOf(sheet, model, usage) {
  if (!usage || !sheet) return null;
  const p = sheet.perMillion?.[model] || (sheet.source === 'MOCK' ? MOCK_PRICE : null);
  if (!p) return null;
  return ((usage.input_tokens || 0) * p.input + (usage.output_tokens || 0) * p.output) / 1e6;
}
