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
    navigate({
      to: "/p/$slug/agents/$agentId/studio",
      params: { slug, agentId: agentName },
    } as any);
  };

  const values = form.getValues();

  const content = (
    <div className="astryx-migrated relative overflow-hidden rounded-[var(--astryx-radius-lg)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] text-[var(--astryx-text-primary)] shadow-[var(--astryx-shadow-dropdown)]">
      {/* Astryx: flat surfaces only. Radial gradient decoration removed. */}
      <div className="relative z-10 space-y-6 p-5 md:p-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--astryx-color-brand-hover)]">
            New Agent Wizard
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Create and launch an AI agent</h2>
          <p className="text-sm text-[var(--astryx-text-secondary)]">
            Define behavior, generate DRAKON IR, review and save.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-colors",
                step >= index
                  ? "bg-[var(--astryx-color-brand)]"
                  : "bg-[var(--astryx-border-subtle)]",
              )}
            />
          ))}
        </div>

        {stepError ? (
          <div className="rounded-[var(--astryx-radius-md)] border border-[color-mix(in_srgb,var(--astryx-semantic-critical-fg)_45%,transparent)] bg-[var(--astryx-semantic-critical-bg)] px-3 py-2 text-sm text-[var(--astryx-semantic-critical-fg)]">
            {stepError}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-[var(--astryx-text-primary)]">
                Agent Name
              </Label>
              <Input
                id="agent-name"
                placeholder="support-assistant"
                className="border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-secondary)]"
                {...form.register("agentName")}
              />
              {form.formState.errors.agentName ? (
                <p className="text-xs text-[var(--astryx-semantic-critical-fg)]">
                  {form.formState.errors.agentName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description" className="text-[var(--astryx-text-primary)]">
                Description & Directives
              </Label>
              <Textarea
                id="agent-description"
                placeholder="Describe responsibilities, communication style, constraints, and expected actions..."
                className="min-h-40 border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-secondary)]"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-xs text-[var(--astryx-semantic-critical-fg)]">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button
                id="generate-agent-schema-btn"
                disabled={!isStepOneValid || generateMutation.isPending}
                onClick={() => void handleGenerate()}
                className="bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] hover:bg-[var(--astryx-color-brand-hover)]"
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
            <div className="flex items-center justify-center rounded-[var(--astryx-radius-md)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-secondary)] px-4 py-4 text-[var(--astryx-color-brand-hover)]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {processingMessages[messageIndex]}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full bg-[var(--astryx-surface-secondary)]" />
              <Skeleton className="h-12 w-[86%] bg-[var(--astryx-surface-secondary)]" />
              <Skeleton className="h-12 w-[92%] bg-[var(--astryx-surface-secondary)]" />
              <Skeleton className="h-12 w-[72%] bg-[var(--astryx-surface-secondary)]" />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="rounded-[var(--astryx-radius-md)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-secondary)] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm text-[var(--astryx-text-primary)]">
                <Bot className="h-4 w-4 text-[var(--astryx-color-brand-hover)]" />
                Generated schema outline
              </div>
              <div className="space-y-2">
                {schemaNodes.length > 0 ? (
                  schemaNodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-start justify-between gap-3 rounded-[var(--astryx-radius-sm)] border border-[var(--astryx-border-subtle)] bg-[var(--astryx-surface-primary)] px-3 py-2"
                    >
                      <p className="text-sm text-[var(--astryx-text-primary)]">{node.content}</p>
                      <span className="rounded-full border border-[color-mix(in_srgb,var(--astryx-color-brand)_30%,transparent)] bg-[var(--astryx-color-brand-light)] px-2 py-0.5 text-xs text-[var(--astryx-color-brand-hover)]">
                        {node.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--astryx-text-secondary)]">
                    Schema generated successfully.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStepError(null);
                  setStep(1);
                }}
              >
                <ArrowLeft />
                Regenerate
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => openStudio(values.agentName)}>
                  <Edit2 />
                  Edit Manually
                </Button>
                <Button
                  id="save-agent-btn"
                  disabled={saveMutation.isPending}
                  className="bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] hover:bg-[var(--astryx-color-brand-hover)]"
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
            <div className="rounded-full bg-[var(--astryx-semantic-ok-bg)] p-5">
              <CheckCircle2 className="h-14 w-14 text-[var(--astryx-semantic-ok-fg)]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight">
                Agent created and saved successfully!
              </h3>
              <p className="text-sm text-[var(--astryx-text-secondary)]">
                Your agent is ready in studio.
              </p>
            </div>
            <Button
              className="bg-[var(--astryx-color-brand)] text-[var(--astryx-color-on-brand)] hover:bg-[var(--astryx-color-brand-hover)]"
              onClick={() => openStudio(values.agentName)}
            >
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
        <DrawerContent className="max-h-[90vh] border-[var(--astryx-border-subtle)] bg-transparent p-0">
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
