import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Edit2,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/lib/api";
import { generateDrakonCode } from "@/lib/codegen/codegenApi";
import { validateDrakonIR } from "@/lib/drakon-validator";
import { cn } from "@/lib/utils";

const wizardSchema = z.object({
  agentName: z
    .string()
    .trim()
    .min(3, "Agent name must be at least 3 characters")
    .regex(/^[a-zA-Z0-9-]+$/, "Use only letters, numbers, and hyphens"),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters"),
});

type WizardValues = z.infer<typeof wizardSchema>;
type WizardStep = 1 | 2 | 3 | 4;

interface NewAgentWizardProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (agentName: string) => void;
  initialAgentName?: string;
  initialDescription?: string;
}

function studioPath(slug: string, agentName: string) {
  return `/p/${slug}/agents/${encodeURIComponent(agentName)}/studio`;
}

function getSchemaNodes(schema: unknown): Array<{ id: string; type: string; content: string }> {
  if (!schema || typeof schema !== "object") return [];
  const items = (schema as { items?: Record<string, unknown> }).items;
  if (!items || typeof items !== "object") return [];

  return Object.entries(items)
    .map(([id, raw]) => {
      const node = raw as { type?: unknown; content?: unknown };
      return {
        id,
        type: typeof node.type === "string" ? node.type : "step",
        content: typeof node.content === "string" ? node.content : "Untitled node",
      };
    })
    .slice(0, 10);
}

const processingMessages = [
  "AI is drafting DRAKON IR schema...",
  "Validating execution paths...",
  "Preparing agent graph structure...",
];

export function NewAgentWizard({
  slug,
  open,
  onOpenChange,
  onSaved,
  initialAgentName,
  initialDescription,
}: NewAgentWizardProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<Record<string, unknown> | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const form = useForm<WizardValues>({
    mode: "onChange",
    defaultValues: {
      agentName: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setStep(1);
      setStepError(null);
      setGeneratedSchema(null);
      setMessageIndex(0);
      form.reset({
        agentName: initialAgentName ?? "",
        description: initialDescription ?? "",
      });
    }
  }, [open, form, initialAgentName, initialDescription]);

  useEffect(() => {
    if (open) {
      form.reset({
        agentName: initialAgentName ?? "",
        description: initialDescription ?? "",
      });
    }
  }, [open, form, initialAgentName, initialDescription]);

  useEffect(() => {
    if (step !== 2) return;
    const timer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % processingMessages.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [step]);

  const watched = form.watch();
  const parsed = useMemo(() => wizardSchema.safeParse(watched), [watched]);
  const isStepOneValid = parsed.success;
  const schemaNodes = useMemo(() => getSchemaNodes(generatedSchema), [generatedSchema]);

  const generateMutation = useMutation({
    mutationFn: async (values: WizardValues) => {
      const response = await generateDrakonCode({
        description: values.description,
        language: "JS2604",
        functionName: values.agentName,
        params: "",
      });

      if (!validateDrakonIR(response.drakon_json)) {
        throw new Error("Invalid schema received from AI. Try refining your description.");
      }

      return response.drakon_json as Record<string, unknown>;
    },
    onMutate: () => {
      setStepError(null);
      setStep(2);
      setMessageIndex(0);
    },
    onSuccess: (schema) => {
      setGeneratedSchema(schema);
      setStep(3);
    },
    onError: () => {
      setStep(1);
      setStepError("Invalid schema received from AI. Try refining your description.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const values = form.getValues();
      const schema = generatedSchema;
      if (!schema) throw new Error("Nothing to save");
      const saveResult = await api.saveDiagram(slug, values.agentName, schema);
      if (!saveResult?.success) {
        throw new Error(saveResult?.message || saveResult?.error || "Failed to save agent");
      }
      return values.agentName;
    },
    onSuccess: (agentName) => {
      setStep(4);
      onSaved?.(agentName);
    },
    onError: (error) => {
      setStepError(error instanceof Error ? error.message : "Failed to save agent");
      setStep(3);
    },
  });

  const handleGenerate = async () => {
    const valid = await form.trigger(["agentName", "description"]);
    if (!valid) return;

    const values = form.getValues();
    const parsedValues = wizardSchema.safeParse(values);
    if (!parsedValues.success) return;

    await generateMutation.mutateAsync(parsedValues.data);
  };

  const openStudio = (agentName: string) => {
    onOpenChange(false);
    navigate({ to: studioPath(slug, agentName) as never });
  };

  const values = form.getValues();

  const content = (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/75 text-slate-100 shadow-[0_30px_100px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,0.23),transparent_45%),radial-gradient(circle_at_90%_20%,rgba(139,92,246,0.25),transparent_50%)]" />
      <div className="relative z-10 space-y-6 p-5 md:p-6">
        <div className="space-y-2">
          <p className="font-[Outfit] text-xs uppercase tracking-[0.2em] text-slate-400">New Agent Wizard</p>
          <h2 className="font-[Outfit] text-2xl">Create and launch an AI agent</h2>
          <p className="text-sm text-slate-300">Define behavior, generate DRAKON IR, review and save.</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                step >= index ? "bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]" : "bg-white/10",
              )}
            />
          ))}
        </div>

        {stepError ? (
          <div className="rounded-lg border border-rose-500/45 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {stepError}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-slate-200">
                Agent Name
              </Label>
              <Input
                id="agent-name"
                placeholder="support-assistant"
                className="border-white/15 bg-white/5"
                {...form.register("agentName")}
              />
              {form.formState.errors.agentName ? (
                <p className="text-xs text-rose-300">{form.formState.errors.agentName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description" className="text-slate-200">
                Description & Directives
              </Label>
              <Textarea
                id="agent-description"
                placeholder="Describe responsibilities, communication style, constraints, and expected actions..."
                className="min-h-40 border-white/15 bg-white/5"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-xs text-rose-300">{form.formState.errors.description.message}</p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button
                id="generate-agent-schema-btn"
                disabled={!isStepOneValid || generateMutation.isPending}
                onClick={() => void handleGenerate()}
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {generateMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Generate Agent Schema
                <ArrowRight />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-indigo-200">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {processingMessages[messageIndex]}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full bg-white/10" />
              <Skeleton className="h-12 w-[86%] bg-white/10" />
              <Skeleton className="h-12 w-[92%] bg-white/10" />
              <Skeleton className="h-12 w-[72%] bg-white/10" />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-200">
                <Bot className="h-4 w-4 text-indigo-300" />
                Generated schema outline
              </div>
              <div className="space-y-2">
                {schemaNodes.length > 0 ? (
                  schemaNodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <p className="text-sm text-slate-200">{node.content}</p>
                      <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-200">
                        {node.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">Schema generated successfully.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                className="border-white/20 bg-white/5"
                onClick={() => {
                  setStepError(null);
                  setStep(1);
                }}
              >
                <ArrowLeft />
                Regenerate
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/5"
                  onClick={() => openStudio(values.agentName)}
                >
                  <Edit2 />
                  Edit Manually
                </Button>
                <Button
                  id="save-agent-btn"
                  disabled={saveMutation.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => void saveMutation.mutateAsync()}
                >
                  {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Save Agent
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col items-center justify-center space-y-5 py-6 text-center">
            <div className="rounded-full bg-emerald-500/15 p-5 shadow-[0_0_60px_rgba(16,185,129,0.45)]">
              <CheckCircle2 className="h-14 w-14 text-emerald-300" />
            </div>
            <div className="space-y-1">
              <h3 className="font-[Outfit] text-2xl">Agent created and saved successfully!</h3>
              <p className="text-sm text-slate-300">Your agent is ready in studio.</p>
            </div>
            <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => openStudio(values.agentName)}>
              <Play />
              Open in Studio
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] border-white/10 bg-transparent p-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>New Agent Wizard</DrawerTitle>
            <DrawerDescription>Generate and save a new AI agent.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto p-2">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-none bg-transparent p-0 shadow-none sm:max-w-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>New Agent Wizard</DialogTitle>
          <DialogDescription>Generate and save a new AI agent.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}