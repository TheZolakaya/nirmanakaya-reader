'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings with anchor IDs
        h1: ({ children, ...props }) => {
          const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
          return <h1 id={id} className="text-3xl font-bold text-amber-400 mb-6 mt-12 first:mt-0" {...props}>{children}</h1>;
        },
        h2: ({ children, ...props }) => {
          const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
          return <h2 id={id} className="text-2xl font-semibold text-zinc-100 mb-4 mt-10 scroll-mt-20" {...props}>{children}</h2>;
        },
        h3: ({ children, ...props }) => {
          const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
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
          <ul className="list-disc list-inside mb-4 space-y-1 text-zinc-300 ml-2" {...props}>{children}</ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 text-zinc-300 ml-2" {...props}>{children}</ol>
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
          <th className="border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-zinc-200 font-medium" {...props}>{children}</th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-zinc-700 px-3 py-2 text-zinc-300" {...props}>{children}</td>
        ),

        // Code
        code: ({ inline, children, className, ...props }) => {
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
