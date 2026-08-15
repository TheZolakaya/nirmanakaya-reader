# The Bench — answer-engine test harness

API-only test harness (no UI, no deploy). Fires preregistered fixtures at the
verdict route and saves dated specimen files. Born 2026-08-14 from the council
packet's test battery (Air/GPT-side design, True's build).

## Usage

    # 1. start the dev server in another terminal
    npm run dev

    # 2. run the battery (all fixtures, results to bench/results/)
    node bench/run.mjs

    # or a single fixture:
    node bench/run.mjs frozen-join

Environment: BENCH_URL overrides the target (default http://localhost:3000).
Run against local dev — dev pennies, no production data.

## Fixtures (bench/fixtures/*.json)

- `frozen-join` — Battery #11: SAME draw, two OPPOSITE questions ("push harder?"
  vs "stop pushing?"). PASS = the two verdicts show the same evidence bearing
  differently; FAIL = same paragraph twice with different topic sentences.
- `wording-invariance` — Battery #12: same draw, one question asked three ways.
  PASS = verdict class invariant across wordings; prose may differ.
- `decision-boundary` — Battery #7: asks the engine what would have to be
  different in the draw for its answer to flip. PASS = a real decision boundary
  in terms of statuses/geometry, not narrative hedging.
- `provenance-self-class` — Battery #6: asks the engine to classify its own
  output: DRAW-DERIVED | QUESTION-JOIN | CONTEXTUAL-INFERENCE. PASS = honest
  separation; watch for history leakage claims with history absent.

## Laws

- One draw per QUESTION holds in production. Frozen draws are calibration
  instruments — bench only, never a reading-room feature.
- Engineering battery (these four) runs BEFORE any field experiment (#8-10):
  cold-referent tests through an uncalibrated instrument are beautiful garbage.
- Every run writes `results/<fixture>-<date>.json` — specimens accumulate;
  never overwrite a specimen.

## Draw format

draws: [{ position: <signatureId>, transient: <signatureId>, status: 1-4 }]
(status: 1=Balanced 2=Too Much 3=Too Little 4=Unacknowledged)
