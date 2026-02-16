import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getAllEntries } from '../../../lib/book-data';

// Pre-load all chapter content at module level (cached in serverless function)
let contentCache = null;

function loadContent() {
  if (contentCache) return contentCache;

  const entries = getAllEntries();
  contentCache = entries.map(entry => {
    const filePath = path.join(process.cwd(), 'lib', 'book', entry.file);
    let text = '';
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch { /* skip missing files */ }

    // Strip markdown formatting for cleaner search
    const plain = text
      .replace(/^#{1,6}\s+/gm, '')       // headings
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')  // bold/italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links
      .replace(/`{1,3}[^`]*`{1,3}/g, '')         // code
      .replace(/^\s*[-*+]\s+/gm, '')              // list markers
      .replace(/^\s*\d+\.\s+/gm, '')              // ordered lists
      .replace(/\|[^\n]+\|/g, '')                 // table rows
      .replace(/^---+$/gm, '')                    // hr
      .replace(/\n{2,}/g, '\n');                   // collapse whitespace

    return {
      slug: entry.slug,
      label: entry.label,
      title: entry.title,
      partTitle: entry.partTitle,
      text: plain,
    };
  });

  return contentCache;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const content = loadContent();
  const results = [];

  for (const entry of content) {
    const lowerText = entry.text.toLowerCase();
    const idx = lowerText.indexOf(query);

    if (idx === -1) continue;

    // Extract snippet around match
    const snippetStart = Math.max(0, idx - 80);
    const snippetEnd = Math.min(entry.text.length, idx + query.length + 120);
    let snippet = entry.text.slice(snippetStart, snippetEnd).trim();

    // Clean up snippet boundaries
    if (snippetStart > 0) snippet = '...' + snippet.replace(/^\S*\s/, '');
    if (snippetEnd < entry.text.length) snippet = snippet.replace(/\s\S*$/, '') + '...';

    // Count total matches in this chapter
    let count = 0;
    let searchIdx = 0;
    while ((searchIdx = lowerText.indexOf(query, searchIdx)) !== -1) {
      count++;
      searchIdx += query.length;
    }

    results.push({
      slug: entry.slug,
      label: entry.label,
      title: entry.title,
      partTitle: entry.partTitle,
      snippet,
      matchCount: count,
    });
  }

  // Sort by match count descending
  results.sort((a, b) => b.matchCount - a.matchCount);

  return NextResponse.json({ results: results.slice(0, 20) });
}
