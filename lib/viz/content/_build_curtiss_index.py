#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse the 22 Curtiss convergence files into a structured content index JSON.

One-shot build helper for lib/viz/content/curtiss_index.json.
Deterministic extraction; summaries are first-sentence distillations of each
finding body. Re-runnable: re-reads the source markdown each time.
"""
import io, sys, os, re, json, glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SRC_DIR = r"D:\Nirmanakaya_Book_Final_0\Nirmanakaya_Final\curtiss"
OUT = r"D:\NKYAWebApp\nirmanakaya-reader\lib\viz\content\curtiss_index.json"

# ---- tradition vocabulary normalization -------------------------------------
# Drop trailing qualifier words to get clean tradition tokens.
QUALIFIERS = {
    "imagery", "numerology", "decomposition", "occultism", "symbolism",
    "initiation", "metaphysics", "mathematics", "comparison", "card",
    "myth", "tradition", "teaching", "doctrine", "title", "ceremony",
    "science", "geometry", "evolution", "distinction", "cosmology",
    "astronomy", "assessment", "theology", "reframe", "philosophy",
    "warning", "citation", "letter", "transition", "naming", "principle",
}

def clean_tradition_cell(cell):
    """Return a list of tradition tokens from one table 'Tradition' cell."""
    cell = cell.strip().strip("*").strip()
    if not cell:
        return []
    # split compound forms like 'Hindu/Egyptian/Greek/Chinese' or 'A / B'
    parts = re.split(r"\s*/\s*", cell)
    out = []
    for p in parts:
        p = p.strip().strip("*").strip()
        if not p:
            continue
        # peel a trailing qualifier word (e.g. 'Curtiss numerology' -> 'Curtiss')
        words = p.split()
        if len(words) >= 2 and words[-1].lower() in QUALIFIERS:
            p = " ".join(words[:-1]).strip()
        # parenthetical like 'Curtiss (Number)' -> 'Curtiss'
        p = re.sub(r"\s*\([^)]*\)\s*$", "", p).strip()
        if p and p not in out:
            out.append(p)
    return out


def split_sections(text):
    """Return dict of the four roman-numeral sections (raw bodies)."""
    heads = list(re.finditer(r"^##\s+(I|II|III|IV)\.\s+(.+?)\s*$", text, re.M))
    secs = {}
    for i, m in enumerate(heads):
        start = m.end()
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        secs[m.group(1)] = text[start:end].strip()
    return secs


def parse_header(text):
    """Extract id, name, traditional name, epigraph."""
    m = re.search(r"^#\s+ARCHETYPE\s+(\d+):\s+(.+?)\s*$", text, re.M)
    aid = int(m.group(1))
    name = m.group(2).strip().title() if m.group(2).isupper() else m.group(2).strip()
    # subtitle line: ### *The Fool — Gestalt House — Seed Function*
    sub = re.search(r"^###\s+\*(.+?)\*\s*$", text, re.M)
    traditional = ""
    if sub:
        traditional = re.split(r"\s+[—-]\s+", sub.group(1).strip())[0].strip()
    # epigraph: first blockquote-style italic quote after the subtitle
    epi = ""
    epim = re.search(r'^\*"(.+?)"\s*(—.*?)?\*\s*$', text, re.M | re.S)
    if epim:
        quote = epim.group(1).strip()
        attr = (epim.group(2) or "").strip()
        epi = ('"' + quote + '"' + (" " + attr if attr else "")).strip()
    return aid, name, traditional, epi


def parse_cross_table(sec2):
    """Return list of {tradition, observation, illuminates} from the summary table."""
    # find the table (everything after a 'Cross-Tradition Summary' heading)
    hm = re.search(r"^###\s+Cross-Tradition Summary.*$", sec2, re.M)
    region = sec2[hm.end():] if hm else sec2
    rows = []
    for line in region.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 3:
            continue
        first = cells[0].strip().strip("*").lower()
        if first.startswith("tradition") or set(cells[0].strip()) <= set("-: "):
            continue
        if not cells[0].strip():
            continue
        rows.append({
            "traditionRaw": cells[0].strip().strip("*").strip(),
            "observation": cells[1].strip(),
            "illuminates": cells[2].strip(),
        })
    return rows


ILLUM_RE = re.compile(r"\[\*Illuminates:\s*(.+?)\s*\*\]", re.S)


def parse_findings(sec2):
    """Split Section II into findings, each ending with an [*Illuminates: ...*] tag.

    Returns list of {title, illuminates, body}. Works for both the '### N.'
    heading style and the bold-lead '**title**' style (files 07/08).
    """
    # cut off at the Cross-Tradition Summary heading
    hm = re.search(r"^###\s+Cross-Tradition Summary.*$", sec2, re.M)
    body = sec2[:hm.start()] if hm else sec2

    # A "What They Found" wrapper heading (files 07/08) is not a finding title.
    GENERIC = {"what they found", "what they found at this position"}

    findings = []
    last = 0
    for m in ILLUM_RE.finditer(body):
        chunk = body[last:m.start()].strip()
        illum = re.sub(r"\s+", " ", m.group(1)).strip()
        last = m.end()

        # Collect candidate titles from both styles, in order of appearance.
        heading_titles = [h.strip() for h in
                          re.findall(r"^###\s+(?:\d+\.\s+)?(.+?)\s*$", chunk, re.M)]
        heading_titles = [h for h in heading_titles
                          if h.strip().strip("*").lower() not in GENERIC]
        bold_titles = [b.strip() for b in
                       re.findall(r"^\*\*(.+?)\*\*\s*$", chunk, re.M)]

        # Numbered '### N.' style -> use heading; bold-lead style -> use bold.
        if heading_titles:
            title = heading_titles[-1]
        elif bold_titles:
            title = bold_titles[-1]
        else:
            bm2 = re.match(r"\*\*(.+?)\*\*", chunk)
            title = bm2.group(1).strip() if bm2 else ""
        title = title.strip().strip("*").strip()

        # Build body text for summary: drop any heading/bold-lead lines AND, for
        # the first finding, drop the Section II preamble (text before the first
        # title line so we summarize the finding, not the section intro).
        lines = chunk.splitlines()
        # find index of the last title line within the chunk
        title_idx = -1
        for i, ln in enumerate(lines):
            s = ln.strip()
            if re.match(r"^###\s+", s) and s.strip("# ").strip("*").lower() not in GENERIC:
                title_idx = i
            elif re.match(r"^\*\*.+?\*\*\s*$", s):
                title_idx = i
        para_lines = lines[title_idx + 1:] if title_idx >= 0 else lines
        para = "\n".join(para_lines)
        para = re.sub(r"^###\s+.*$", "", para, flags=re.M)
        para = re.sub(r"^\*\*.+?\*\*\s*$", "", para, flags=re.M)
        para = para.strip()
        findings.append({"title": title, "illuminates": illum, "body": para})
    return findings


def first_sentences(text, n=2):
    """Return up to n sentences distilled from text (strip markdown emphasis)."""
    t = re.sub(r"\s+", " ", text).strip()
    t = t.replace("*", "").replace("`", "")
    # break into sentences (naive but adequate for prose)
    sents = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"])", t)
    sents = [s.strip() for s in sents if s.strip()]
    return " ".join(sents[:n]).strip()


def build_one(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    aid, name, traditional, epi = parse_header(text)
    secs = split_sections(text)
    sec2 = secs.get("II", "")
    findings_raw = parse_findings(sec2)
    table = parse_cross_table(sec2)

    convergence = []
    for i, fr in enumerate(findings_raw):
        trow = table[i] if i < len(table) else None
        traditions = clean_tradition_cell(trow["traditionRaw"]) if trow else []
        convergence.append({
            "n": i + 1,
            "title": fr["title"],
            "traditions": traditions,
            "illuminates": fr["illuminates"],
            "summary": first_sentences(fr["body"], 2),
        })

    cross = [{
        "tradition": r["traditionRaw"],
        "observation": r["observation"],
        "illuminates": r["illuminates"],
    } for r in table]

    return str(aid), {
        "id": aid,
        "name": name,
        "traditional": traditional,
        "epigraph": epi,
        "convergence": convergence,
        "crossTraditionTable": cross,
        "howItWorks": secs.get("III", "").strip(),
        "encounter": secs.get("IV", "").strip(),
    }


def main():
    files = sorted(
        p for p in glob.glob(os.path.join(SRC_DIR, "archetype_[0-9]*.md"))
        if "placeholder" not in os.path.basename(p)
    )
    index = {}
    total_findings = 0
    for p in files:
        try:
            key, rec = build_one(p)
            index[key] = rec
            total_findings += len(rec["convergence"])
            print(f"  {os.path.basename(p):32s} -> id {rec['id']:>2}  "
                  f"{len(rec['convergence'])} findings, {len(rec['crossTraditionTable'])} table rows")
        except Exception as e:
            print(f"  ERROR {os.path.basename(p)}: {e}")
    # order keys numerically
    ordered = {str(i): index[str(i)] for i in range(22) if str(i) in index}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)
    print(f"\nArchetypes: {len(ordered)}   Total convergence findings: {total_findings}")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
