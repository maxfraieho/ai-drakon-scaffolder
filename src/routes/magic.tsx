import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { parseOwnerRepo, saveDiagramToGit } from '@/lib/mcp/projects';
import { getGithubConfig } from '@/lib/settings-storage';

export const Route = createFileRoute('/magic')({
  component: MagicDemoPage,
});

function MagicDemoPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      // Backend: POST /api/magic/generate
      // Using a placeholder URL for now, will connect to Cloudflare worker
      const response = await fetch('/api/magic/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, lang: 'js' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate magic diagram');
      }
      
      const data = await response.json();
      setResult(data);
      // Implementation of SSE streaming for progress will be done later
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToGithub = async () => {
    const config = getGithubConfig();
    const ownerRepo = parseOwnerRepo(`${config.owner}/${config.repo}`);
    if (!config.token.trim() || !ownerRepo) {
      toast.error('Налаштуйте GitHub token і репозиторій у Settings');
      return;
    }

    setIsSaving(true);
    try {
      const diagramId = String(result?.diagramId || result?.id || crypto.randomUUID());
      await saveDiagramToGit({
        ...ownerRepo,
        branch: config.branch || 'main',
        diagramId,
        diagram: result?.diagram || result,
        token: config.token,
      });
      toast.success(`Схему збережено в GitHub: drn/${diagramId}.json`);
    } catch (error) {
      toast.error(`Помилка збереження в GitHub: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent">
            AI-DRAKON Magic
          </h1>
          <p className="text-xl text-[var(--text-secondary)]">
            Опишіть ваш алгоритм, і ми перетворимо його на живу DRAKON-схему за 30 секунд.
          </p>
        </div>

        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl">
          <CardHeader>
            <CardTitle>Що ви хочете створити?</CardTitle>
            <CardDescription>
              Наприклад: "Система бронювання квитків з оплатою через Stripe"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Опишіть логіку тут..."
              className="min-h-[150px] resize-none bg-[var(--bg-base)] border-[var(--border-subtle)]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            
            <div className="flex justify-end">
              <Button 
                onClick={handleGenerate} 
                disabled={isLoading || !prompt.trim()}
                className="bg-[var(--accent-amber)] text-black hover:bg-[var(--accent-amber)]/90"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Генеруємо...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    ✨ Створити схему
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xl mt-8 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle>Результат</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-[var(--bg-base)] p-4 font-mono text-sm overflow-x-auto">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveToGithub} disabled={isSaving} variant="outline" className="border-[var(--accent-amber)] text-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/10">
                  {isSaving ? 'Зберігаємо...' : 'Зберегти в GitHub'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
