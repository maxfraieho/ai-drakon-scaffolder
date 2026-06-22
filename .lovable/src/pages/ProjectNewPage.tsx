import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useProject } from "@/context/ProjectContext";
import { readSettings } from "@/lib/settings-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Plus, Loader2, ArrowRight, Github, MessageSquare, 
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, Bot, ArrowLeft, Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { account, databases } from "@/lib/appwrite";
import { getAccessToken } from "@/lib/auth";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GhRepo {
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private?: boolean;
  owner: {
    login: string;
  };
}

export function ProjectNewPage() {
  const navigate = useNavigate();
  const { addLocalProject, setActiveProject } = useProject();
  
  const [step, setStep] = useState<"repo" | "interview" | "scaffolding">("repo");
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Repo Selection State
  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GhRepo | null>(null);
  const [manualRepo, setManualRepo] = useState("");
  
  // Project Config
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [language, setLanguage] = useState<"javascript" | "lua">("javascript");
  
  // Interview State
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  
  // Scaffolding Progress State
  const [scaffoldProgress, setScaffoldProgress] = useState<Array<{
    label: string;
    status: "pending" | "running" | "success" | "error";
  }>>([
    { label: "Створення конфігурації проекту...", status: "pending" },
    { label: "Аналіз інтерв'ю та генерація docs/domain.md...", status: "pending" },
    { label: "Створення solution.json та скелетних схем...", status: "pending" },
    { label: "Ініціалізація локального робочого простору...", status: "pending" }
  ]);

  useEffect(() => {
    void loadGithubToken();
  }, []);

  useEffect(() => {
    if (token) {
      void fetchUserRepos();
    }
  }, [token]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadGithubToken = async () => {
    let tok = readSettings().github?.token || "";
    if (!tok) {
      try {
        const session = await account.getSession("current");
        try {
          const doc: any = await databases.getDocument("ai-drakon", "user_profiles", session.userId);
          if (doc.githubToken) tok = doc.githubToken;
        } catch (_) {}
        if (!tok && session.provider === "github" && session.providerAccessToken) {
          tok = session.providerAccessToken;
        }
      } catch (_) {}
    }
    setToken(tok);
  };

  const handleConnectGithub = async () => {
    setIsConnecting(true);
    try {
      const jwtObj = await account.createJWT();
      const jwt = jwtObj.jwt;
      if (!jwt) {
        toast.error("Не вдалося отримати токен авторизації");
        return;
      }
      
      const settings = readSettings();
      const workerUrl = (settings.app.workerUrl || "https://drakon-antigravity-worker.maxfraieho.workers.dev").replace(/\/$/, "");
      const authUrl = `${workerUrl}/auth/github/start?token=${encodeURIComponent(jwt)}&popup=true`;

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popupWindow = window.open(
        authUrl,
        "Connect GitHub",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popupWindow) {
        toast.error("Попап заблоковано. Будь ласка, дозвольте спливаючі вікна.");
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "GITHUB_CONNECTED") {
          window.removeEventListener("message", handleMessage);
          toast.success("GitHub підключено успішно!");
          void loadGithubToken();
        }
      };

      window.addEventListener("message", handleMessage);
      
      const checkClosed = setInterval(() => {
        if (popupWindow.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
        }
      }, 1000);

    } catch (error) {
      toast.error("Помилка підключення GitHub");
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchUserRepos = async () => {
    setLoadingRepos(true);
    try {
      const resp = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      if (resp.ok) {
        const data = await resp.json();
        setRepos(data);
      } else {
        console.error("GitHub API status error:", resp.status);
      }
    } catch (e) {
      console.error("Failed to load user repos:", e);
    } finally {
      setLoadingRepos(false);
    }
  };

  const selectRepository = (repo: GhRepo) => {
    setSelectedRepo(repo);
    setProjectTitle(repo.name);
    setProjectDesc(repo.description || "");
  };

  const handleNextToInterview = () => {
    if (!selectedRepo && !manualRepo.trim()) {
      toast.error("Оберіть репозиторій або введіть його назву");
      return;
    }
    if (!projectTitle.trim()) {
      toast.error("Введіть назву проекту");
      return;
    }

    setStep("interview");
    
    // Add initial greeting
    setMessages([
      {
        role: "assistant",
        content: `Привіт! Я твій Документознавець (Docs Agent). Я допоможу скласти технічний опис (Domain Model) твого майбутнього проекту "${projectTitle}".\n\nОпиши своїми словами, що саме повинна робити твоя система? Які функції або бізнес-правила в ній будуть?`
      }
    ]);
  };

  const sendChatMessage = async () => {
    if (!userInput.trim() || sendingMessage) return;
    const userMsg = userInput;
    setUserInput("");
    
    const updatedMsgs = [...messages, { role: "user", content: userMsg } as Message];
    setMessages(updatedMsgs);
    setSendingMessage(true);

    try {
      const docsUrl = readSettings().agents.docsUrl || "https://docs-agent.exodus.pp.ua";
      const resp = await fetch(`${docsUrl.replace(/\/+$/, "")}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          context: {
            currentDoc: "domain.md",
            project: projectTitle
          }
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setMessages([...updatedMsgs, { role: "assistant", content: data.reply || data.response || "..." }]);
    } catch (e) {
      toast.error("Помилка зв'язку з Документознавцем");
      setMessages([...updatedMsgs, { role: "assistant", content: "Вибач, сталася помилка при обробці запиту." }]);
    } finally {
      setSendingMessage(false);
    }
  };

  const startScaffolding = async () => {
    setStep("scaffolding");
    
    const updateStatus = (index: number, status: "running" | "success" | "error") => {
      setScaffoldProgress(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status };
        return next;
      });
    };

    const owner = selectedRepo ? selectedRepo.owner.login : manualRepo.split("/")[0] || "custom";
    const repoName = selectedRepo ? selectedRepo.name : manualRepo.split("/")[1] || projectTitle;
    const slug = projectTitle.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const branch = selectedRepo ? selectedRepo.default_branch : "main";
    const docsUrl = (readSettings().agents.docsUrl || "https://docs-agent.exodus.pp.ua").replace(/\/$/, "");
    const architectUrl = (readSettings().agents.architectUrl || "https://architect-agent.exodus.pp.ua").replace(/\/$/, "");

    // STEP 1: Add project in registry
    updateStatus(0, "running");
    try {
      await fetch(`${docsUrl}/projects/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: projectTitle,
          path: `/home/vokov/projects/${slug}`,
          description: projectDesc,
          hasDrakonIr: true,
          hasDocs: true,
          github: { owner, repo: repoName, branch }
        })
      });

      await fetch(`${architectUrl}/projects/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectTitle,
          description: projectDesc,
          repo_url: `https://github.com/${owner}/${repoName}`,
          branch
        })
      });
      
      updateStatus(0, "success");
    } catch (e) {
      console.error(e);
      updateStatus(0, "error");
      toast.error("Не вдалося створити конфігурацію проекту на сервері");
      return;
    }

    // STEP 2: Generate domain.md
    updateStatus(1, "running");
    try {
      const chatHistory = messages
        .map(m => `${m.role === 'user' ? 'Користувач' : 'Документознавець'}: ${m.content}`)
        .join('\n\n');

      const resp = await fetch(`${docsUrl}/docs/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview: chatHistory,
          project: slug,
          slug: "domain",
          tags: ["domain", slug]
        })
      });

      if (!resp.ok) throw new Error("Docs-Agent domain generate failed");
      updateStatus(1, "success");
    } catch (e) {
      console.error(e);
      updateStatus(1, "error");
      toast.error("Не вдалося згенерувати docs/domain.md");
      return;
    }

    // STEP 3: Scaffold Diagrams
    updateStatus(2, "running");
    try {
      const resp = await fetch(`${architectUrl}/projects/${slug}/scaffold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language
        })
      });

      if (!resp.ok) throw new Error("Architect-Agent scaffolding failed");
      updateStatus(2, "success");
    } catch (e) {
      console.error(e);
      updateStatus(2, "error");
      toast.error("Не вдалося згенерувати схеми DRAKON та solution.json");
      return;
    }

    // STEP 4: Local Workspace Registry
    updateStatus(3, "running");
    try {
      const newProj = {
        slug,
        name: `${owner}/${repoName}`,
        description: projectDesc,
        hasDrakonIr: true,
        hasDocs: true,
        exists: true,
        github: {
          owner,
          repo: repoName,
          branch
        }
      };

      addLocalProject(newProj);
      setActiveProject(newProj);
      updateStatus(3, "success");
      
      toast.success("Проект успішно згенеровано!");
      
      setTimeout(() => {
        navigate({ to: "/diagrams" });
      }, 1500);

    } catch (e) {
      console.error(e);
      updateStatus(3, "error");
    }
  };

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex-grow flex flex-col p-6 min-h-0 bg-[var(--bg-base)] text-[var(--text-primary)] font-mono select-none relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      
      <div className="max-w-4xl w-full mx-auto flex flex-col flex-grow min-h-0 relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 shrink-0">
          <div className="space-y-1">
            <h1 className="text-lg font-bold flex items-center gap-2 text-[var(--accent-amber)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
              Створити новий проект
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Стартове інтерв'ю з AI-агентом для автоматичної генерації архітектури
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-[var(--text-muted)] hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Назад
          </Button>
        </div>

        {/* STEP 1: Repository configuration */}
        {step === "repo" && (
          <div className="flex-grow overflow-y-auto space-y-6 pr-2">
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* GitHub Auth and List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">Репозиторій GitHub</Label>
                  {!token && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleConnectGithub} 
                      disabled={isConnecting}
                      className="h-7 text-[10px] border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                    >
                      {isConnecting ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Github className="w-3.5 h-3.5 mr-1.5" />}
                      Підключити GitHub
                    </Button>
                  )}
                </div>

                {token ? (
                  <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-xl overflow-hidden flex flex-col h-[320px]">
                    <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
                      <Input
                        placeholder="Шукати репозиторій..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="h-8 bg-[var(--bg-surface)] border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                      />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                      {loadingRepos ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)] text-xs">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Завантаження репозиторіїв...</span>
                        </div>
                      ) : filteredRepos.length > 0 ? (
                        filteredRepos.map(repo => (
                          <div
                            key={repo.full_name}
                            onClick={() => selectRepository(repo)}
                            className={cn(
                              "px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between",
                              selectedRepo?.full_name === repo.full_name
                                ? "border-[var(--accent-amber)] bg-[var(--accent-dim)] text-[var(--accent-amber)]"
                                : "border-transparent hover:bg-white/5 text-[var(--text-secondary)] hover:text-white"
                            )}
                          >
                            <span className="truncate pr-2">{repo.full_name}</span>
                            {repo.private && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--border-subtle)] text-[var(--text-muted)] scale-90">private</span>}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-[var(--text-muted)] text-xs py-8">Не знайдено</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-[var(--border-subtle)] rounded-xl p-8 text-center space-y-4">
                    <Github className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-60" />
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h3 className="text-sm font-semibold">Немає підключення до GitHub</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Підключіть GitHub, щоб отримати доступ до своїх проектів та автоматизувати коміти.
                      </p>
                    </div>
                    <Button onClick={handleConnectGithub} className="bg-[var(--accent-amber)] hover:brightness-110 text-black text-xs font-semibold">
                      Підключити зараз
                    </Button>
                  </div>
                )}

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Або введіть вручну</span>
                  <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
                </div>

                <div className="space-y-1.5">
                  <Input
                    placeholder="власник/назва-репозиторію"
                    value={manualRepo}
                    onChange={(e) => {
                      setManualRepo(e.target.value);
                      setSelectedRepo(null);
                    }}
                    disabled={!!selectedRepo}
                    className="h-9 bg-[var(--bg-surface)] border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Наприклад: `maxfraieho/my-awesome-app`
                  </p>
                </div>
              </div>

              {/* Project settings card */}
              <div className="space-y-4 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-xl p-5">
                <Label className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">Параметри проекту</Label>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--text-secondary)]">Назва проекту (slug)</Label>
                    <Input
                      placeholder="my-project"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="h-9 bg-[var(--bg-base)] border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--text-secondary)]">Короткий опис</Label>
                    <Textarea
                      placeholder="Опишіть призначення цього проекту"
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      rows={3}
                      className="bg-[var(--bg-base)] border-[var(--border-subtle)] text-xs text-[var(--text-primary)] resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--text-secondary)]">Цільова мова програмування</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setLanguage("javascript")}
                        className={cn(
                          "p-3 rounded-lg border text-center cursor-pointer transition-all",
                          language === "javascript"
                            ? "border-[var(--accent-amber)] bg-[var(--accent-dim)] text-[var(--accent-amber)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-white"
                        )}
                      >
                        <span className="text-xs font-semibold block">JavaScript</span>
                        <span className="text-[10px] opacity-75">Vite / React/ Node</span>
                      </div>
                      
                      <div
                        onClick={() => setLanguage("lua")}
                        className={cn(
                          "p-3 rounded-lg border text-center cursor-pointer transition-all",
                          language === "lua"
                            ? "border-[var(--accent-amber)] bg-[var(--accent-dim)] text-[var(--accent-amber)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-white"
                        )}
                      >
                        <span className="text-xs font-semibold block">Lua</span>
                        <span className="text-[10px] opacity-75">OpenResty / Embedded</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <Button
                    onClick={handleNextToInterview}
                    disabled={!selectedRepo && !manualRepo.trim()}
                    className="w-full bg-[var(--accent-amber)] hover:brightness-110 text-black text-xs font-semibold h-10 flex items-center justify-center gap-1.5"
                  >
                    Далі: Стартове інтерв'ю
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 2: Starter Interview */}
        {step === "interview" && (
          <div className="flex-grow flex flex-col min-h-0 border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-xl overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--accent-amber)]" />
                <span className="text-xs font-bold text-[var(--accent-amber)] uppercase tracking-wider">Документознавець (Docs Agent)</span>
              </div>
              <Button
                onClick={startScaffolding}
                disabled={messages.length < 2}
                className="h-8 bg-[var(--accent-amber)] hover:brightness-110 text-black text-[11px] font-semibold flex items-center gap-1.5"
              >
                Завершити інтерв'ю & Створити проект
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap font-mono border",
                    msg.role === "user"
                      ? "ml-auto bg-[var(--bg-elevated)] border-[var(--accent-amber)]/20 text-[var(--text-primary)]"
                      : "mr-auto bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  )}
                >
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] opacity-50 block mb-1.5">
                    {msg.role === "user" ? "Ви" : "Docs Agent"}
                  </span>
                  {msg.content}
                </div>
              ))}
              {sendingMessage && (
                <div className="mr-auto bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-xs text-[var(--text-muted)] flex items-center gap-2 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Docs Agent думає...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0 flex gap-2">
              <Textarea
                placeholder="Опишіть вашу ідею, вимоги чи наступні функції..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChatMessage();
                  }
                }}
                disabled={sendingMessage}
                rows={2}
                className="flex-grow resize-none bg-[var(--bg-surface)] border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus-visible:ring-[var(--accent-amber)]/30 min-h-0 py-2.5 font-mono"
              />
              <Button
                onClick={sendChatMessage}
                disabled={!userInput.trim() || sendingMessage}
                className="w-10 h-10 self-end shrink-0 bg-[var(--accent-amber)] hover:brightness-110 text-black flex items-center justify-center rounded-lg"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Scaffolding Generation Progress */}
        {step === "scaffolding" && (
          <div className="flex-grow flex items-center justify-center p-6">
            <div className="max-w-md w-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl p-6 space-y-6">
              <div className="text-center space-y-2">
                <Sparkles className="w-8 h-8 text-[var(--accent-amber)] mx-auto animate-bounce" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">Створення проекту...</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Створюємо модулі, генерацію схем та solution.json...
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                {scaffoldProgress.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    {item.status === "pending" && (
                      <div className="w-5 h-5 rounded-full border border-[var(--border-subtle)] shrink-0" />
                    )}
                    {item.status === "running" && (
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-amber)] shrink-0" />
                    )}
                    {item.status === "success" && (
                      <Check className="w-5 h-5 text-emerald-400 bg-emerald-500/10 rounded-full p-0.5 border border-emerald-500/30 shrink-0" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span className={cn(
                      "font-mono",
                      item.status === "running" && "text-[var(--accent-amber)] font-semibold",
                      item.status === "success" && "text-[var(--text-primary)]",
                      item.status === "pending" && "text-[var(--text-muted)]",
                      item.status === "error" && "text-red-400"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
