import { useEffect, useRef, useState } from "react";
import { Bot, Trash } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PlayPipeComponentStatus = "pending" | "has-agent" | "building" | "done";

export type PlayPipeComponentItem = {
  id: string;
  name: string;
  description: string;
  status: PlayPipeComponentStatus;
  agentId?: string;
};

type ComponentCardProps = {
  component: PlayPipeComponentItem;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAssignAgent: () => void;
  onDelete: () => void;
  autoFocusName?: boolean;
};

const statusMeta: Record<PlayPipeComponentStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  },
  "has-agent": {
    label: "Has Agent",
    className: "border-blue-400/30 bg-blue-500/15 text-blue-200",
  },
  building: {
    label: "Building",
    className: "border-amber-400/35 bg-amber-500/15 text-amber-200",
  },
  done: {
    label: "Done",
    className: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
  },
};

export function ComponentCard({
  component,
  onNameChange,
  onDescriptionChange,
  onAssignAgent,
  onDelete,
  autoFocusName = false,
}: ComponentCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocusName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [autoFocusName]);

  const meta = statusMeta[component.status];

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/55 p-4 backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Badge className={cn("font-normal", meta.className)}>{meta.label}</Badge>
        {component.agentId ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-400/25 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
            <Bot className="h-3.5 w-3.5" />
            {component.agentId}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <Input
          ref={nameRef}
          value={component.name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Component name"
          className="border-white/15 bg-white/5"
        />
        <Textarea
          value={component.description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Component responsibility and scope"
          className="min-h-24 border-white/15 bg-white/5"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={onAssignAgent}
          className="bg-indigo-600 text-white hover:bg-indigo-500"
        >
          <Bot className="h-4 w-4" />
          Assign Agent
        </Button>

        {!confirmDelete ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
          >
            <Trash className="h-4 w-4" />
            Delete
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
            >
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-slate-300">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
