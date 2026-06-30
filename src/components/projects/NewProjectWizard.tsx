import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Github,
  Loader2,
  Package,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { createGithubRepo } from "@/lib/github-api";
import { getGithubConfig } from "@/lib/settings-storage";
import { cn } from "@/lib/utils";
import type { KnowledgeGraph } from "@/lib/understand/types";
import { account } from "@/lib/appwrite";
import { OAuthProvider } from "appwrite";

const stepOneSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be at most 50 characters"),
  description: z.string().max(200, "Description must be at most 200 characters").optional().or(z.literal("")),
  mode: z.enum(["agent", "playpipe", "n8n"]),
  aiAssisted: z.boolean(),
});

const wizardSchema = stepOneSchema
  .extend({
    autoCreateRepo: z.boolean(),
    manualRepoUrl: z.string().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.autoCreateRepo) return;

    if (!value.manualRepoUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repository URL is required when auto-create is disabled",
        path: ["manualRepoUrl"],
      });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(value.manualRepoUrl);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid HTTPS Git URL",
        path: ["manualRepoUrl"],
      });
      return;
    }

    if (parsed.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repository URL must use HTTPS",
        path: ["manualRepoUrl"],
      });
      return;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repository URL must contain owner and repo",
        path: ["manualRepoUrl"],
      });
    }
  });

type WizardFormValues = z.output<typeof wizardSchema>;

type WizardStep = 1 | 2 | 3;

type SuccessState = {
  slug: string;
  name: string;
  mode: WizardFormValues["mode"];
  githubUrl?: string;
};

const modeOptions: Array<{
  mode: WizardFormValues["mode"];
  title: string;
  description: string;
  icon: typeof Bot;
}> = [
  {
    mode: "agent",
    title: "Agent System",
    description: "Build AI agents for specific tasks",
    icon: Bot,
  },
  {
    mode: "playpipe",
    title: "App / PlayPipe",
    description: "Build apps using component agents",
    icon: Package,
  },
  {
    mode: "n8n",
    title: "N8N Automation",
    description: "Create workflow automations",
    icon: Workflow,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function parseGithubFromUrl(url: string): { owner: string; repo: string; branch: "main" } | undefined {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) return undefined;
    const [owner, repoRaw] = parsed.pathname.split("/").filter(Boolean);
    const repo = repoRaw?.replace(/\.git$/, "");
    if (!owner || !repo) return undefined;
    return { owner, repo, branch: "main" };
  } catch {
    return undefined;
  }
}

export function NewProjectWizard() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/project/new', strict: false }) as any;
  const [step, setStep] = useState<WizardStep>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);

  const githubConnected = Boolean(getGithubConfig().token?.trim());

  const form = useForm<WizardFormValues>({
    mode: "onChange",
    defaultValues: {
      name: search?.template ? `${search.template}-app` : "",
      description: search?.template ? `Generated from ${search.template} template` : "",
      mode: "agent",
      aiAssisted: true,
      autoCreateRepo: true,
      manualRepoUrl: "",
    },
  });

  const autoCreateRepo = form.watch("autoCreateRepo");
  const values = form.watch();

  const isStepOneValid = useMemo(() => {
    return stepOneSchema.safeParse({
      name: values.name,
      description: values.description,
      mode: values.mode,
      aiAssisted: values.aiAssisted,
    }).success;
  }, [values.name, values.description, values.mode, values.aiAssisted]);

  const isStepTwoValid = useMemo(() => {
    if (autoCreateRepo) return true;
    return wizardSchema.safeParse(values).success;
  }, [autoCreateRepo, values]);

  const createProjectMutation = useMutation({
    mutationFn: async (formValues: WizardFormValues) => {
      setStepError(null);

      const slug = slugify(formValues.name);
      if (!slug) {
        throw new Error("Project name generated an invalid slug");
      }

      let githubInfo: { owner: string; repo: string; branch: "main" } | undefined;
      let githubUrl: string | undefined;

      if (formValues.autoCreateRepo) {
        if (!githubConnected) {
          throw new Error("GitHub Token Error - please link GitHub in Settings");
        }

        const repoResponse = await createGithubRepo(slug);
        if (!repoResponse.success) {
          throw new Error("Failed to auto-create GitHub repository");
        }

        const [owner, repo] = repoResponse.fullName.split("/");
        if (!owner || !repo) {
          throw new Error("Invalid repository details returned from GitHub");
        }

        githubInfo = { owner, repo, branch: "main" };
        githubUrl = repoResponse.repoUrl;
      } else {
        githubInfo = parseGithubFromUrl(formValues.manualRepoUrl ?? "");
        githubUrl = formValues.manualRepoUrl?.trim() || undefined;
      }

      const result = await api.addProject({
        slug,
        name: formValues.name,
        path: `/projects/${slug}`,
        description: formValues.description?.trim() || undefined,
        github: githubInfo,
        hasDrakonIr: formValues.aiAssisted,
        hasDocs: formValues.aiAssisted,
      });

      if (!result.success) {
        throw new Error("Project name already exists or project creation failed");
      }

      // TASK-DRK-21: Auto-generate knowledge graph on project creation
      if (githubInfo) {
        const skeletonKg: KnowledgeGraph = {
          version: "1.0",
          kind: "codebase",
          project: {
            name: formValues.name,
            languages: formValues.mode === "agent" ? ["typescript", "javascript"] : [formValues.mode],
            frameworks: ["ai-drakon"],
            description: formValues.description?.trim() || "",
            analyzedAt: new Date().toISOString(),
            gitCommitHash: "",
          },
          nodes: [
            {
              id: "root-project",
              type: "module",
              name: formValues.name,
              summary: formValues.description?.trim() || "Initial project module",
              tags: ["project-root", formValues.mode],
              complexity: "simple",
            }
          ],
          edges: [],
          layers: [],
          tour: [],
        };

        try {
          await api.githubCommitFile(
            githubInfo.owner,
            githubInfo.repo,
            ".understand-anything/knowledge-graph.json",
            JSON.stringify(skeletonKg, null, 2),
            "chore: initialize knowledge graph",
            githubInfo.branch || "main"
          );
        } catch (err) {
          console.warn("Failed to auto-generate knowledge graph:", err);
        }
      }

      return {
        slug,
        name: formValues.name,
        mode: formValues.mode,
        githubUrl,
      } satisfies SuccessState;
    },
    onSuccess: (payload) => {
      setSuccessState(payload);
      setStep(3);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to create project";
      setStepError(message);
    },
  });

  const modeIcon = (mode: WizardFormValues["mode"]) => {
    if (mode === "agent") return Bot;
    if (mode === "playpipe") return Package;
    return Workflow;
  };

  const modeLabel = (mode: WizardFormValues["mode"]) => {
    if (mode === "agent") return "Agent";
    if (mode === "playpipe") return "PlayPipe";
    return "N8N";
  };

  const onSubmit = form.handleSubmit(async (formValues) => {
    const parsedValues = wizardSchema.safeParse(formValues);
    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          form.setError(field as keyof WizardFormValues, {
            type: "validate",
            message: issue.message,
          });
        }
      }
      return;
    }

    await createProjectMutation.mutateAsync(parsedValues.data);
  });

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-8 font-[Inter] text-slate-100 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.18),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(217,70,239,0.18),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(139,92,246,0.2),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]" />

      <Card className="relative z-10 w-full max-w-3xl border-white/10 bg-slate-950/55 shadow-[0_24px_80px_rgba(67,56,202,0.3)] backdrop-blur-xl">
        <CardHeader className="space-y-6 pb-2">
          <div className="space-y-2">
            <p className="font-[Outfit] text-xs uppercase tracking-[0.22em] text-slate-400">Project setup</p>
            <CardTitle className="font-[Outfit] text-2xl md:text-3xl">New project wizard</CardTitle>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                    step >= index
                      ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-200"
                      : "border-white/15 bg-white/5 text-slate-400",
                  )}
                >
                  {index}
                </div>
                <span className={cn("text-xs", step >= index ? "text-slate-100" : "text-slate-500")}>
                  Step {index}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6 pt-4">
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-slate-200">
                  Project Name
                </Label>
                <Input
                  id="project-name"
                  placeholder="My Awesome Project"
                  className="border-white/15 bg-white/5"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-slate-200">
                  Project Description
                </Label>
                <Textarea
                  id="project-description"
                  placeholder="Briefly describe your project"
                  className="min-h-24 border-white/15 bg-white/5"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-rose-400">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Project Mode</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  {modeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = form.watch("mode") === option.mode;

                    return (
                      <button
                        key={option.mode}
                        type="button"
                        className={cn(
                          "rounded-lg border px-4 py-4 text-left transition-all",
                          "bg-white/5 hover:bg-white/10",
                          isActive
                            ? "border-indigo-400/70 shadow-[0_0_0_1px_rgba(129,140,248,0.45),0_10px_30px_rgba(99,102,241,0.25)]"
                            : "border-white/15",
                        )}
                        onClick={() => form.setValue("mode", option.mode, { shouldValidate: true })}
                      >
                        <Icon className={cn("mb-3 h-5 w-5", isActive ? "text-indigo-300" : "text-slate-400")} />
                        <p className="font-[Outfit] text-sm text-slate-100">{option.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-[Outfit] text-sm text-slate-100">ШІ-асистування (AI Assistance)</p>
                  <p className="text-xs text-slate-400">
                    Автоматично підключити Docs-Agent та Architect-Agent для аналізу вимог та проектування схем.
                  </p>
                </div>
                <Switch
                  id="ai-assisted"
                  checked={form.watch("aiAssisted")}
                  onCheckedChange={(checked) => {
                    form.setValue("aiAssisted", checked, { shouldValidate: true });
                  }}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  id="wizard-next-step"
                  type="button"
                  disabled={!isStepOneValid}
                  onClick={async () => {
                    const isValid = await form.trigger(["name", "description", "mode"]);
                    if (isValid) setStep(2);
                  }}
                >
                  Next
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-[Outfit] text-sm text-slate-100">Auto-create GitHub repository</p>
                  <p className="text-xs text-slate-400">
                    {autoCreateRepo
                      ? "A new repository will be created under your connected GitHub account."
                      : "Provide an existing HTTPS Git repository URL manually."}
                  </p>
                </div>
                <Switch
                  id="auto-create-repo"
                  checked={autoCreateRepo}
                  onCheckedChange={(checked) => {
                    form.setValue("autoCreateRepo", checked, { shouldValidate: true });
                    if (checked) {
                      form.clearErrors("manualRepoUrl");
                    }
                  }}
                />
              </div>

              {!autoCreateRepo && (
                <div className="space-y-2">
                  <Label htmlFor="manual-repo-url" className="text-slate-200">
                    GitHub Repository URL
                  </Label>
                  <Input
                    id="manual-repo-url"
                    placeholder="https://github.com/owner/repo"
                    className="border-white/15 bg-white/5"
                    {...form.register("manualRepoUrl")}
                  />
                  {form.formState.errors.manualRepoUrl && (
                    <p className="text-xs text-rose-400">{form.formState.errors.manualRepoUrl.message}</p>
                  )}
                </div>
              )}

              {autoCreateRepo && !githubConnected && (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                  <Github className="h-4 w-4" />
                  <AlertTitle>Потрібно підключити GitHub</AlertTitle>
                  <AlertDescription className="mt-1 flex flex-col gap-2 items-start">
                    <span>
                      Для автоматичного створення репозиторію необхідно підключити ваш акаунт GitHub.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        account.createOAuth2Token(
                          OAuthProvider.Github,
                          window.location.href,
                          window.location.href,
                          ["user:email", "repo", "read:org"]
                        );
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-black text-xs font-semibold h-8 gap-1.5 rounded-[var(--radius-sm)] border-0 mt-1"
                    >
                      <Github className="h-3.5 w-3.5" />
                      Підключити GitHub в один клік
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {stepError && (
                <Alert variant="destructive">
                  <AlertTitle>Could not create project</AlertTitle>
                  <AlertDescription>{stepError}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <Button id="wizard-back-step" type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft />
                  Back
                </Button>
                <Button
                  id="wizard-create-project"
                  type="submit"
                  disabled={createProjectMutation.isPending || !isStepTwoValid || (autoCreateRepo && !githubConnected)}
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Project
                      <ArrowRight />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && successState && (
            <div className="flex flex-col items-center justify-center space-y-5 py-6 text-center">
              <div className="rounded-full bg-emerald-500/15 p-5 shadow-[0_0_40px_rgba(16,185,129,0.35)]">
                <CheckCircle2 className="h-14 w-14 animate-pulse text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h3 className="font-[Outfit] text-2xl text-slate-100">Project created successfully!</h3>
                <p className="text-sm text-slate-400">Your project is ready. You can enter it now.</p>
              </div>

              <div className="w-full max-w-md space-y-2 rounded-lg border border-white/10 bg-white/5 p-4 text-left">
                <p className="text-sm text-slate-200">
                  <span className="text-slate-400">Project Name:</span> {successState.name}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <span className="text-slate-400">Project Mode:</span>
                  <Badge className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200">
                    {(() => {
                      const Icon = modeIcon(successState.mode);
                      return <Icon className="mr-1 h-3.5 w-3.5" />;
                    })()}
                    {modeLabel(successState.mode)}
                  </Badge>
                </div>
                {successState.githubUrl && (
                  <p className="break-all text-sm text-slate-200">
                    <span className="text-slate-400">GitHub Repository URL:</span> {successState.githubUrl}
                  </p>
                )}
              </div>

              <Button
                id="wizard-enter-project"
                className="min-w-56 bg-indigo-500 text-white hover:bg-indigo-400"
                onClick={() => {
                  window.location.assign(`/p/${successState.slug}/overview`);
                }}
              >
                Enter Project
                <ArrowRight />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
