import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil, Eye, Columns2, Save, X, Loader2 } from 'lucide-react';
import type { Components } from 'react-markdown';

interface MarkdownEditorProps {
  path: string;
  content: string;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving?: boolean;
}

const mdComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mb-4 mt-6 pb-2 border-b border-border">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mb-3 mt-5 pb-1 border-b border-border/50">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mb-2 mt-4">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-foreground mb-2 mt-3">{children}</h4>,
  p: ({ children }) => <p className="text-sm text-foreground/90 leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-foreground/90 pl-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-foreground/90 pl-2">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">{children}</a>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-border pl-4 my-3 text-muted-foreground italic text-sm">{children}</blockquote>,
  hr: () => <hr className="border-border my-4" />,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
  del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) return <code className={`${className} block`}>{children}</code>;
    return <code className="bg-muted text-[var(--accent-amber)] px-1.5 py-0.5 rounded text-[0.8em] font-mono">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="bg-zinc-900 border border-border rounded-md p-4 overflow-x-auto mb-3 text-sm font-mono text-green-300 leading-relaxed">
      {children}
    </pre>
  ),
  // Tables — головна проблема без @tailwindcss/typography
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse border border-border rounded-md overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-foreground border-b border-border uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-foreground/85 border-r border-border/40 last:border-r-0">
      {children}
    </td>
  ),
};

const MarkdownPreview = ({ content }: { content: string }) => (
  <div className="h-full overflow-y-auto p-6">
    <div className="max-w-none text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  </div>
);

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  path,
  content,
  onContentChange,
  onSave,
  onClose,
  saving = false,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  return (
    <div className="flex flex-col h-full w-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 shrink-0">
        <span className="font-mono text-xs text-muted-foreground truncate flex-1 mr-2">{path}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex bg-muted rounded-md p-0.5 gap-0.5">
            {([
              { mode: 'edit', icon: Pencil, title: 'Редагування' },
              { mode: 'split', icon: Columns2, title: 'Split' },
              { mode: 'preview', icon: Eye, title: 'Перегляд' },
            ] as const).map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={title}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Зберегти
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 min-h-0 overflow-hidden ${viewMode === 'split' ? 'grid grid-cols-2' : ''}`}>
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`h-full ${viewMode === 'split' ? 'border-r border-border' : ''}`}>
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={content}
              onChange={(v) => onContentChange(v ?? '')}
              options={{
                fontSize: 14,
                wordWrap: 'on',
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'line',
                smoothScrolling: true,
              }}
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <MarkdownPreview content={content} />
        )}
      </div>
    </div>
  );
};
