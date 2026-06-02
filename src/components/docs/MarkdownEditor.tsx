import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { Pencil, Eye, Columns2, Save, X, Loader2 } from 'lucide-react';

interface MarkdownEditorProps {
  path: string;
  content: string;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving?: boolean;
}

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
          {/* View mode toggle */}
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
        {/* Editor pane */}
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

        {/* Preview pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="h-full overflow-y-auto p-6">
            <article className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
};
