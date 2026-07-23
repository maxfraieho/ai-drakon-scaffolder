import { createFileRoute, Link } from '@tanstack/react-router';
import { templates } from '@/data/templates';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, LayoutTemplate } from 'lucide-react';

export const Route = createFileRoute('/templates')({
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      <header className="flex h-14 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-amber)]/10">
            <LayoutTemplate className="h-4 w-4 text-[var(--accent-amber)]" />
          </div>
          <div>
            <h1 className="font-mono text-sm uppercase tracking-wider text-[var(--text-primary)]">Templates Gallery</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Галерея шаблонів</h2>
            <p className="text-[var(--text-secondary)]">
              Почніть роботу швидше за допомогою готових шаблонів DRAKON-схем для типових сценаріїв.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="flex flex-col border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden transition-all hover:border-[var(--accent-amber)]/50 hover:shadow-md">
                <div className="h-48 bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center p-4 relative overflow-hidden group">
                  {/* Decorative background pattern */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[var(--accent-amber)] to-transparent"></div>
                  <LayoutTemplate className="h-16 w-16 text-neutral-600 group-hover:text-[var(--accent-amber)]/60 transition-colors duration-300 z-10" />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--text-primary)]">{template.title}</CardTitle>
                  <CardDescription className="text-[var(--text-secondary)] line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-subtle)]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-[var(--border-subtle)]/50">
                  <Link 
                    to="/project/new" 
                    search={{ template: template.id }}
                    className="w-full"
                  >
                    <Button className="w-full bg-[var(--bg-base)] hover:bg-[var(--accent-amber)] hover:text-black text-[var(--text-primary)] border border-[var(--border-subtle)] group transition-all">
                      Використати шаблон
                      <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
