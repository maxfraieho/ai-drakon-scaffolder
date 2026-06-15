import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markOnboarded } from "@/lib/onboarding";
import { Github, Loader2 } from "lucide-react";
import { getAppwriteJwt } from "@/lib/appwrite-jwt";
import { readSettings } from "@/lib/settings-storage";
import { toast } from "sonner";

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
  onSandbox: () => void;
}

const STEPS = [
  {
    title: "Твій простір",
    subtitle: "Твій простір. Тут житиме логіка, яку ти контролюєш.",
  },
  {
    title: "Підключи GitHub",
    subtitle: "Підключи GitHub — твій код і схеми лишаються твоїми.",
  },
  {
    title: "Обери модель",
    subtitle: "Обери модель (або пропусти). Агент виконує — рішення за тобою.",
  },
];

export function OnboardingWizard({ userId, onComplete, onSandbox }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [spaceName, setSpaceName] = useState("");
  const [pat, setPat] = useState("");
  const [llmKey, setLlmKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGithub = async () => {
    setIsConnecting(true);
    try {
      const jwt = await getAppwriteJwt();
      if (!jwt) {
        toast.error("Не вдалося отримати токен авторизації");
        return;
      }
      const settings = readSettings();
      const workerUrl = (settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
      window.location.href = `${workerUrl}/auth/github/start?token=${encodeURIComponent(jwt)}`;
    } catch (error) {
      toast.error("Помилка підключення GitHub");
    } finally {
      setIsConnecting(false);
    }
  };

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      markOnboarded(userId);
      onComplete();
    }
  }

  function handleSkip() {
    markOnboarded(userId);
    onComplete();
  }

  function handleSandbox() {
    markOnboarded(userId);
    onSandbox();
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-lg">
        {step === 0 && (
          <div className="mb-4 text-center space-y-1">
            <h2 className="text-xl font-bold">DRAKON Suite — AI, за яку відповідає людина.</h2>
            <p className="text-sm text-muted-foreground">
              Ти малюєш логіку, яку розумієш. Система компілює її в робочого агента.
              <br />
              Кожне рішення видиме й затверджуєш ти — нічого не ховається в чорний ящик.
            </p>
          </div>
        )}

        <DialogHeader>
          <div className="flex gap-2 mb-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <DialogTitle>
            Крок {step + 1} з {STEPS.length}: {STEPS[step].title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === 0 && (
            <>
              <div className="space-y-1">
                <Label>Назва простору</Label>
                <Input
                  placeholder="Мій проект"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                />
              </div>
              <div className="pt-2 border rounded p-3 bg-muted/40 space-y-2">
                <p className="text-sm font-medium">Або спробуй без налаштувань:</p>
                <Button variant="outline" className="w-full" onClick={handleSandbox}>
                  Спробувати на демо-схемі
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Подивись, як схема стає кодом — за секунди, без налаштувань.
                </p>
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>GitHub App OAuth (рекомендовано)</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-teal-500/30 hover:border-teal-500/50 hover:bg-teal-500/10 text-xs font-semibold"
                  onClick={handleConnectGithub}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Github className="h-4 w-4 text-teal-400" />
                  )}
                  Підключити GitHub
                </Button>
                <p className="text-xs text-muted-foreground">
                  Авторизуйтеся через GitHub, щоб надати системі доступ до репозиторіїв та комітів.
                </p>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border/40"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Або вкажіть PAT</span>
                <div className="flex-grow border-t border-border/40"></div>
              </div>

              <div className="space-y-1">
                <Label>GitHub Personal Access Token</Label>
                <Input
                  type="password"
                  placeholder="ghp_..."
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Можна використовувати Personal Access Token, якщо ви віддаєте перевагу ручному налаштуванню.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-1">
              <Label>API-ключ LLM (необов'язково)</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={llmKey}
                onChange={(e) => setLlmKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Без ключа компіляція працює на платформній квоті.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={handleSkip}>
            Пропустити все
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Назад
              </Button>
            )}
            <Button onClick={handleNext}>
              {step < STEPS.length - 1 ? "Далі" : "Почати"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
