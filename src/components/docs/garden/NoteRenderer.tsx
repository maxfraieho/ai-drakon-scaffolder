import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import { WikiLink } from "./WikiLink";

interface NoteRendererProps {
  content: string;
  onNavigate?: (slug: string) => void;
}

// Replace [[wiki|alias]] / [[wiki]] with placeholder tokens we can intercept
const WIKI_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function NoteRenderer({ content, onNavigate }: NoteRendererProps) {
  const { transformed, links } = useMemo(() => {
    const links: { slug: string; alias?: string }[] = [];
    const transformed = content.replace(WIKI_RE, (_m, slug: string, alias?: string) => {
      const idx = links.length;
      links.push({ slug: slug.trim(), alias: alias?.trim() });
      return `\u0000WIKI${idx}\u0000`;
    });
    return { transformed, links };
  }, [content]);

  const renderText = (text: string) => {
    const parts = text.split(/\u0000WIKI(\d+)\u0000/);
    if (parts.length === 1) return text;
    const out: (string | JSX.Element)[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i]) out.push(parts[i]);
      } else {
        const link = links[Number(parts[i])];
        if (link) {
          out.push(
            <WikiLink
              key={`wl-${i}`}
              slug={link.slug}
              alias={link.alias}
              onNavigate={onNavigate}
            />,
          );
        }
      }
    }
    return <>{out}</>;
  };

  return (
    <div className="prose prose-sm prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{wrapChildren(children, renderText)}</p>,
          li: ({ children }) => <li>{wrapChildren(children, renderText)}</li>,
          h1: ({ children }) => <h1>{wrapChildren(children, renderText)}</h1>,
          h2: ({ children }) => <h2>{wrapChildren(children, renderText)}</h2>,
          h3: ({ children }) => <h3>{wrapChildren(children, renderText)}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-[var(--accent-amber)]">
              {children}
            </a>
          ),
          code: ({ children, className }) => (
            <code className={className}>{children}</code>
          ),
        }}
      >
        {transformed}
      </ReactMarkdown>
    </div>
  );
}

function wrapChildren(children: React.ReactNode, render: (s: string) => React.ReactNode): React.ReactNode {
  if (typeof children === "string") return render(children);
  if (Array.isArray(children)) {
    return children.map((c, i) => (typeof c === "string" ? <span key={i}>{render(c)}</span> : c));
  }
  return children;
}
