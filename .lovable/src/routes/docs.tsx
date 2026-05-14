import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FileText, FolderTree, Loader2, Network, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DaviaSettingsPanel } from "@/components/docs/DaviaSettingsPanel";
import { DocsVersionPanel } from "@/components/docs/DocsVersionPanel";
import { NotesTab } from "@/components/docs/NotesTab";
import { NotesGraphTab } from "@/components/docs/NotesGraphTab";
import { DocsFilesTab } from "@/components/docs/DocsFilesTab";
import { useDaviaSettings } from "@/hooks/useDaviaSettings";
import { docsApi, type DocsAnalysisItem } from "@/lib/docs-api";

export const Route = createFileRoute("/docs")({
  component: DocsRoute,
});

type JobStatus = "idle" | "running" | "done" | "error";

function DocsRoute() {
  const { settings: davia, save: saveDavia, reset: resetDavia } = useDaviaSettings();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [docsTab, setDocsTab] = useState<"generator" | "notes" | "files" | "graph">("generator");
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  const handleGraphNodeClick = (slug: string) => {
    setFocusedSlug(slug);
    setDocsTab("notes");
  };
  const [analyses, setAnalyses] = useState<DocsAnalysisItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  if (typeof window !== "undefined" && !localStorage.getItem("jwt")) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    if (jobStatus !== "running" || !jobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await docsApi.status(jobId);
        if (cancelled) return;
        const tail = Array.isArray(data.log_tail)
          ? data.log_tail
          : typeof data.log_tail === "string"
            ? data.log_tail.split("\n")
            : [];
        if (tail.length) setLog(tail);
        if (data.status === "done") {
          setJobStatus("done");
          try {
            const a = await docsApi.analysis();
            if (!cancelled) setAnalyses(a.analyses ?? []);
          } catch (e) {
            console.error(e);
          }
          toast.success("Документацію згенеровано");
        } else if (data.status === "error") {
          setJobStatus("error");
          toast.error("Помилка генерації документації");
        }
      } catch (e) {
        if (cancelled) return;
        setJobStatus("error");
        toast.error(e instanceof Error ? e.message : "Помилка статусу");
      }
    };
    const id = setInterval(tick, 3000);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobStatus, jobId]);

  useEffect(() => {
    if (jobStatus !== "running") return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      if (startedAtRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [jobStatus]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const handleGenerate = async () => {
    if (!davia.outputVersion.trim()) {
      toast.error("Вкажіть назву версії", {
        description: "Розгорніть «Версія документації» та задайте папку.",
      });
      return;
    }
    setJobStatus("running");
    setLog([]);
    setAnalyses([]);
    try {
      const resp = await docsApi.generate(instructions.trim() || undefined, {
        protocol: davia.protocol,
        baseUrl: davia.baseUrl,
        apiKey: davia.apiKey,
        model: davia.model,
        maxTokens: davia.maxTokens,
        outputVersion: davia.outputVersion.trim(),
      });
      setJobId(resp.job_id);
      toast.message("Генерацію запущено", { description: `Job: ${resp.job_id}` });
    } catch (e) {
      setJobStatus("error");
      toast.error(e instanceof Error ? e.message : "Не вдалося запустити");
    }
  };

  const running = jobStatus === "running";

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-5xl px-3 py-4 md:px-6">
        <header className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--accent-amber)]" />
          <h1 className="text-lg font-semibold md:text-2xl">Документація</h1>
        </header>

        <Tabs value={docsTab} onValueChange={(v) => setDocsTab(v as typeof docsTab)} className="w-full">
          <TabsList className="no-scrollbar mb-3 flex w-full justify-start overflow-x-auto whitespace-nowrap md:w-auto md:inline-flex">
            <TabsTrigger value="generator">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Генератор
            </TabsTrigger>
            <TabsTrigger value="notes">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Документи
            </TabsTrigger>
            <TabsTrigger value="files">
              <FolderTree className="mr-1.5 h-3.5 w-3.5" />
              Файли
            </TabsTrigger>
            <TabsTrigger value="graph">
              <Network className="mr-1.5 h-3.5 w-3.5" />
              Граф
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Генератор документації</CardTitle>
                <CardDescription>
                  Вкажи провайдера та генеруй документацію
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="docs-instructions">
                    Інструкції (необов'язково)
                  </label>
                  <Textarea
                    id="docs-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Необов'язкові інструкції для генерації..."
                    rows={3}
                    disabled={running}
                  />
                </div>

                <DaviaSettingsPanel settings={davia} onSave={saveDavia} onReset={resetDavia} />

                <DocsVersionPanel settings={davia} onSave={saveDavia} />

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleGenerate} disabled={running}>
                    {running ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Генерація… {elapsed}s
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Генерувати документацію
                      </>
                    )}
                  </Button>
                  {jobId && (
                    <span className="font-mono text-xs text-muted-foreground">job: {jobId}</span>
                  )}
                  {jobStatus === "done" && (
                    <span className="text-xs text-emerald-500">✓ Готово</span>
                  )}
                  {jobStatus === "error" && (
                    <span className="text-xs text-red-500">✗ Помилка</span>
                  )}
                </div>

                <div
                  ref={logRef}
                  className="log-area h-72 overflow-y-auto rounded-md border border-border bg-black p-3 font-mono text-xs text-green-300"
                >
                  {log.length === 0 ? (
                    <div className="text-muted-foreground">Лог порожній…</div>
                  ) : (
                    log.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap break-words">
                        {line}
                      </div>
                    ))
                  )}
                </div>

                {analyses.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Згенеровані файли</h2>
                    <ul className="space-y-2">
                      {analyses.map((a) => (
                        <li key={a.path} className="rounded-md border border-border p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.file_count} файлів
                            </div>
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {a.path}
                          </div>
                          {a.files?.length > 0 && (
                            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs">
                              {a.files.slice(0, 20).map((f) => (
                                <li key={f} className="font-mono">
                                  {f}
                                </li>
                              ))}
                              {a.files.length > 20 && (
                                <li className="text-muted-foreground">
                                  …та ще {a.files.length - 20}
                                </li>
                              )}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <NotesTab focusSlug={focusedSlug} onFocusClear={() => setFocusedSlug(null)} />
          </TabsContent>

          <TabsContent value="files">
            <DocsFilesTab onNoteOpen={(slug) => { setFocusedSlug(slug); setDocsTab("notes"); }} />
          </TabsContent>

          <TabsContent value="graph">
            <NotesGraphTab onNodeClick={handleGraphNodeClick} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
