import { createFileRoute, Link } from '@tanstack/react-router';
import { Activity } from 'lucide-react';

export const Route = createFileRoute('/trace')({
  component: ExecutionTracePage,
});

function ExecutionTracePage() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-amber)]/10">
            <Activity className="h-4 w-4 text-[var(--accent-amber)]" />
          </div>
          <div>
            <h1 className="font-mono text-sm uppercase tracking-wider text-[var(--text-primary)]">Execution Trace</h1>
            <p className="text-[11px] text-[var(--text-muted)]">Перегляд історії виконання та вердиктів 4-Gate Control Plane</p>
          </div>
        </div>
      </header>
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
          <Activity className="h-8 w-8 text-[var(--text-muted)] mb-4 opacity-50" />
          <h2 className="text-[var(--text-primary)] font-medium mb-2">Глобальний Trace недоступний</h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-md">
            Трасування виконується безпосередньо у вікні PipelineDrakonView під час запуску схеми. 
            Запустіть пайплайн, щоб побачити логі виконання.
          </p>
          <Link to="/pipelines" className="mt-5 inline-flex items-center rounded-md bg-[var(--accent-amber)] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90">
            Перейти до пайплайнів
          </Link>
        </div>
      </div>
    </div>
  );
}
