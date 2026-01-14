# Documentation Pages Implementation Spec
## Version 1.1 | For Claude Code Implementation

---

## Overview

Add two documentation pages to the Reader application and integrate help links throughout the UI. Documentation opens in new tabs to preserve reading state.

---

## Content Files

The markdown content is already in the repo:
- **Manual:** `lib/guide-content.md`
- **Exposé:** `lib/about-content.md`

Import these as raw strings or read at build time.

---

## New Routes

### 1. `/guide` — Reader Manual
**File:** `app/guide/page.js`
**Content source:** `lib/guide-content.md`

### 2. `/about` — Why Nirmanakaya Isn't Tarot  
**File:** `app/about/page.js`
**Content source:** `lib/about-content.md`

---

## Page Implementation

### Option A: Inline Layout (Simpler, Recommended)

Each page wraps itself with the docs layout. No route grouping needed.

**Create shared wrapper component** `components/shared/DocsWrapper.js`:

```jsx
export default function DocsWrapper({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Simple header with back link */}
      <header className="border-b border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a 
            href="/" 
            className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-2"
          >
            ← Back to Reader
          </a>
          <span className="text-zinc-500 text-xs uppercase tracking-wider">NIRMANAKAYA</span>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Simple footer */}
      <footer className="border-t border-zinc-800 px-4 py-6 mt-12">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 text-xs">
          <a href="/" className="text-amber-400 hover:text-amber-300">
            reader.nirmanakaya.com
          </a>
        </div>
      </footer>
    </div>
  );
}
```

### Option B: Route Group (If Preferred)

If using route groups, place pages INSIDE the group:
- `app/(docs)/guide/page.js`
- `app/(docs)/about/page.js`
- `app/(docs)/layout.js`

---

## Markdown Rendering

Install dependency:
```bash
npm install react-markdown remark-gfm
```

**Create** `components/shared/MarkdownRenderer.js`:

```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper to create URL-safe anchor IDs
const toAnchorId = (text) => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings with anchor IDs
        h1: ({ children, ...props }) => {
          const id = toAnchorId(children);
          return <h1 id={id} className="text-3xl font-bold text-amber-400 mb-6 mt-12 first:mt-0" {...props}>{children}</h1>;
        },
        h2: ({ children, ...props }) => {
          const id = toAnchorId(children);
          return <h2 id={id} className="text-2xl font-semibold text-zinc-100 mb-4 mt-10 scroll-mt-20" {...props}>{children}</h2>;
        },
        h3: ({ children, ...props }) => {
          const id = toAnchorId(children);
          return <h3 id={id} className="text-xl font-medium text-zinc-200 mb-3 mt-8 scroll-mt-20" {...props}>{children}</h3>;
        },
        h4: ({ children, ...props }) => (
          <h4 className="text-lg font-medium text-zinc-300 mb-2 mt-6" {...props}>{children}</h4>
        ),
        
        // Paragraphs
        p: ({ children, ...props }) => (
          <p className="text-zinc-300 mb-4 leading-relaxed" {...props}>{children}</p>
        ),
        
        // Lists
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside mb-4 space-y-1 text-zinc-300 ml-4" {...props}>{children}</ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 text-zinc-300 ml-4" {...props}>{children}</ol>
        ),
        li: ({ children, ...props }) => (
          <li className="text-zinc-300" {...props}>{children}</li>
        ),
        
        // Tables
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-zinc-700" {...props}>{children}</table>
          </div>
        ),
        thead: ({ children, ...props }) => (
          <thead className="bg-zinc-800" {...props}>{children}</thead>
        ),
        th: ({ children, ...props }) => (
          <th className="border border-zinc-700 px-3 py-2 text-left text-zinc-200 font-medium" {...props}>{children}</th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-zinc-700 px-3 py-2 text-zinc-300" {...props}>{children}</td>
        ),
        
        // Code
        code: ({ inline, className, children, ...props }) => {
          if (inline) {
            return <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-amber-300 text-sm" {...props}>{children}</code>;
          }
          return (
            <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-4 overflow-x-auto">
              <code className="text-zinc-300 text-sm" {...props}>{children}</code>
            </pre>
          );
        },
        
        // Links
        a: ({ href, children, ...props }) => {
          const isExternal = href?.startsWith('http');
          const isAnchor = href?.startsWith('#');
          return (
            <a 
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="text-amber-400 hover:text-amber-300 underline decoration-dotted underline-offset-2"
              {...props}
            >
              {children}
            </a>
          );
        },
        
        // Blockquotes
        blockquote: ({ children, ...props }) => (
          <blockquote className="border-l-4 border-amber-500/50 pl-4 my-4 text-zinc-400 italic" {...props}>
            {children}
          </blockquote>
        ),
        
        // Horizontal rules
        hr: () => <hr className="border-zinc-700 my-8" />,
        
        // Strong/Bold
        strong: ({ children, ...props }) => (
          <strong className="text-zinc-100 font-semibold" {...props}>{children}</strong>
        ),
        
        // Emphasis/Italic
        em: ({ children, ...props }) => (
          <em className="text-zinc-200" {...props}>{children}</em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

---

## Page Files

### Guide Page — `app/guide/page.js`

```jsx
import DocsWrapper from '../../components/shared/DocsWrapper';
import MarkdownRenderer from '../../components/shared/MarkdownRenderer';
import guideContent from '../../lib/guide-content.md';

export const metadata = {
  title: 'Reader Guide | Nirmanakaya',
  description: 'Complete guide to using the Nirmanakaya Reader - modes, depths, voice customization, and more.',
};

export default function GuidePage() {
  return (
    <DocsWrapper>
      <article>
        <MarkdownRenderer content={guideContent} />
      </article>
    </DocsWrapper>
  );
}
```

### About Page — `app/about/page.js`

```jsx
import DocsWrapper from '../../components/shared/DocsWrapper';
import MarkdownRenderer from '../../components/shared/MarkdownRenderer';
import aboutContent from '../../lib/about-content.md';

export const metadata = {
  title: "Why Nirmanakaya Isn't Tarot | Nirmanakaya",
  description: 'The difference between fortune-telling and consciousness navigation.',
};

export default function AboutPage() {
  return (
    <DocsWrapper>
      <article>
        <MarkdownRenderer content={aboutContent} />
      </article>
    </DocsWrapper>
  );
}
```

### Importing Markdown Files

To import `.md` files as strings in Next.js, add to `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    return config;
  },
};

module.exports = nextConfig;
```

**Alternative:** If webpack config is complex, just copy the markdown content inline as a template literal string in each page file.

---

## Anchor IDs Reference

The `toAnchorId` function in MarkdownRenderer converts headings to anchors. Here are the key anchors that will be generated from the manual:

| Heading | Anchor ID |
|---------|-----------|
| Executive Summary | `#executive-summary` |
| Quick Start Guide | `#quick-start-guide` |
| The Four Modes | `#the-four-modes` |
| Discover Mode | `#discover-mode` |
| Reflect Mode | `#reflect-mode` |
| Forge Mode | `#forge-mode` |
| Explore Mode (DTP) | `#explore-mode-dtp` |
| The Depth System | `#the-depth-system` |
| Voice Customization | `#voice-customization` |
| Delivery Presets | `#delivery-presets` |
| Voice Sliders | `#voice-sliders` |
| Personas | `#personas` |
| Special Modes | `#special-modes` |
| Card Anatomy | `#card-anatomy` |
| The 78 Signatures | `#the-78-signatures` |
| Status System | `#status-system` |
| Philosophical Foundation | `#philosophical-foundation` |

---

## UI Integration — Help Links

### Location 1: Entry Screen (IntroSection.js)

Add to the bottom of the intro section, before the reading input:

```jsx
{/* Help Links */}
<div className="flex justify-center gap-4 mt-6 text-xs">
  <a 
    href="/guide" 
    target="_blank"
    rel="noopener noreferrer"
    className="text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1"
  >
    <span>📖</span> Reader Guide
  </a>
  <span className="text-zinc-700">•</span>
  <a 
    href="/about" 
    target="_blank"
    rel="noopener noreferrer"
    className="text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1"
  >
    <span>❓</span> What is this?
  </a>
</div>
```

### Location 2: Reading Screen Header

In the main page.js header bar (near the version number):

```jsx
{/* Help Links in Header */}
<div className="flex items-center gap-3 text-xs">
  <a 
    href="/guide" 
    target="_blank"
    rel="noopener noreferrer"
    className="text-zinc-500 hover:text-amber-400 transition-colors"
    title="Reader Guide"
  >
    📖
  </a>
  <a 
    href="/about" 
    target="_blank"
    rel="noopener noreferrer"
    className="text-zinc-500 hover:text-amber-400 transition-colors"
    title="What is this?"
  >
    ❓
  </a>
</div>
```

### Location 3: Mode Selector Help

Near the mode selector tabs:

```jsx
{/* Mode Help Link */}
<a 
  href="/guide#the-four-modes" 
  target="_blank"
  rel="noopener noreferrer"
  className="text-[0.6rem] text-zinc-600 hover:text-zinc-400 transition-colors ml-2"
>
  learn more →
</a>
```

### Location 4: Voice Panel Help

In the voice/persona settings panel:

```jsx
{/* Voice Help Link */}
<a 
  href="/guide#voice-customization" 
  target="_blank"
  rel="noopener noreferrer"
  className="text-[0.6rem] text-zinc-600 hover:text-zinc-400 transition-colors"
>
  how voice works →
</a>
```

### Location 5: Footer (Both Screens)

Add a simple footer:

```jsx
{/* Footer */}
<footer className="border-t border-zinc-800/50 mt-8 pt-4 pb-6">
  <div className="flex justify-center gap-4 text-xs text-zinc-600">
    <a 
      href="/guide" 
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-zinc-400 transition-colors"
    >
      Guide
    </a>
    <span>•</span>
    <a 
      href="/about" 
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-zinc-400 transition-colors"
    >
      About
    </a>
    <span>•</span>
    <a 
      href="https://nirmanakaya.com" 
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-zinc-400 transition-colors"
    >
      Nirmanakaya.com
    </a>
  </div>
</footer>
```

---

## File Structure After Implementation

```
app/
├── guide/
│   └── page.js           ← Reader Manual page
├── about/
│   └── page.js           ← Why Not Tarot page
├── page.js               ← Main reader (add help links + footer)
└── ...

components/
├── shared/
│   ├── DocsWrapper.js       ← NEW: Docs page wrapper
│   ├── MarkdownRenderer.js  ← NEW: Styled markdown component
│   └── ...
└── reader/
    ├── IntroSection.js      ← Add help links
    └── ...

lib/
├── guide-content.md         ← Manual markdown (EXISTS)
├── about-content.md         ← Exposé markdown (EXISTS)
└── ...
```

---

## Implementation Checklist

- [ ] Install `react-markdown` and `remark-gfm`
- [ ] Update `next.config.js` for markdown imports (or inline content)
- [ ] Create `DocsWrapper.js` component
- [ ] Create `MarkdownRenderer.js` component
- [ ] Create `/guide` page using `lib/guide-content.md`
- [ ] Create `/about` page using `lib/about-content.md`
- [ ] Add help links to IntroSection.js (entry screen)
- [ ] Add help icons to header bar (reading screen)
- [ ] Add mode help link near mode selector
- [ ] Add voice help link in voice panel
- [ ] Add footer with links to both screens
- [ ] Test all anchor links scroll correctly
- [ ] Test new tabs open without losing reading state
- [ ] Verify mobile responsiveness of doc pages
- [ ] Deploy and verify

---

## Testing Notes

1. **Link Behavior:** All documentation links MUST use `target="_blank"` to prevent losing reading state
2. **Anchor Links:** Test that `#discover-mode`, `#voice-customization` etc. scroll correctly with `scroll-mt-20` offset
3. **Mobile:** Documentation pages should be readable on mobile with horizontal scroll on tables/code
4. **Back Link:** Ensure "Back to Reader" link works from doc pages

---

*Spec Version: 1.1*
*Updated: January 2026*
*For: Claude Code Implementation*
