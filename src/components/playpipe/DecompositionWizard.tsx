import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Loader2, Play, Plus, Sparkles } from "lucide-react";
import { z } from "zod";

import { ComponentCard, type PlayPipeComponentItem } from "@/components/playpipe/ComponentCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const decompositionSchema = z.object({
  appDescription: z
    .string()
    .trim()
    .min(30, "Description must be at least 30 characters."),
});

type DecompositionValues = z.infer<typeof decompositionSchema>;

type WizardPhase = "empty" | "loading" | "components";

type DecompositionWizardProps = {
  phase: WizardPhase;
  decomposePending: boolean;
  decomposeError: string | null;
  componentsQueue: PlayPipeComponentItem[];
  autoFocusComponentId?: string | null;
  onDecompose: (appDescription: string) => Promise<void>;
  onAddManual: () => void;
  onAddComponent: () => void;
  onNameChange: (id: string, value: string) => void;
  onDescriptionChange: (id: string, value: string) => void;
  onAssignAgent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onStartBuild: () => Promise<void>;
  canStartBuild: boolean;
  buildPending: boolean;
};

export function DecompositionWizard({
  phase,
  decomposePending,
  decomposeError,
  componentsQueue,
  autoFocusComponentId,
  onDecompose,
  onAddManual,
  onAddComponent,
  onNameChange,
  onDescriptionChange,
  onAssignAgent,
  onDeleteComponent,
  onStartBuild,
  canStartBuild,
  buildPending,
}: DecompositionWizardProps) {
  const form = useForm<DecompositionValues>({
    mode: "onChange",
    defaultValues: {
      appDescription: "",
    },
  });

  const description = form.watch("appDescription") ?? "";
  const canDecompose = useMemo(() => description.trim().length >= 30 && !decomposePending, [description, decomposePending]);

  const handleDecompose = async () => {
    const parsed = decompositionSchema.safeParse({ appDescription: description });
    if (!parsed.success) {
      form.setError("appDescription", {
        type: "manual",
        message: parsed.error.issues[0]?.message ?? "Please provide more details.",
      });
      return;
    }
    form.clearErrors("appDescription");
    await onDecompose(parsed.data.appDescription);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-4">
        <h2 className="font-[Outfit] text-xl text-slate-100">Decomposition Wizard</h2>
        <p className="mt-1 text-sm text-slate-300">Describe your app and assign a dedicated builder agent per component.</p>
      </div>

      {decomposeError ? (
        <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <p>{decomposeError}</p>
          {phase === "empty" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddManual}
              className="mt-3 border-rose-300/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
            >
              <Plus className="h-4 w-4" />
              Add Component Manually
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === "empty" ? (
        <div className="space-y-4">
          <Textarea
            value={description}
            onChange={(event) => {
              form.setValue("appDescription", event.target.value, { shouldDirty: true, shouldValidate: true });
            }}
            placeholder="Describe the application you want to build in detail..."
            className="min-h-44 border-white/15 bg-white/5"
          />
          {form.formState.errors.appDescription ? (
            <p className="text-xs text-rose-300">{form.formState.errors.appDescription.message}</p>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={!canDecompose} onClick={() => void handleDecompose()} className="bg-indigo-600 text-white hover:bg-indigo-500">
              {decomposePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Decompose into Components
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "loading" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-indigo-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Architect agent is analyzing your application structure...
          </div>
          <div className="space-y-3">
            <Skeleton className="h-28 w-full bg-white/10" />
            <Skeleton className="h-28 w-[92%] bg-white/10" />
            <Skeleton className="h-28 w-[85%] bg-white/10" />
          </div>
        </div>
      ) : null}

      {phase === "components" ? (
        <div className="space-y-4">
          <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            {componentsQueue.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                autoFocusName={component.id === autoFocusComponentId}
                onNameChange={(value) => onNameChange(component.id, value)}
                onDescriptionChange={(value) => onDescriptionChange(component.id, value)}
                onAssignAgent={() => onAssignAgent(component.id)}
                onDelete={() => onDeleteComponent(component.id)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="outline" onClick={onAddComponent} className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10">
              <Plus className="h-4 w-4" />
              Add Component
            </Button>
            <Button disabled={!canStartBuild || buildPending} onClick={() => void onStartBuild()} className="ml-auto bg-emerald-600 text-white hover:bg-emerald-500">
              {buildPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start PlayPipe Build
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
