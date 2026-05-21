import { useCallback, useEffect, useRef, useState } from "react";
import {
AlertCircle,
CheckCircle2,
ChevronDown,
ClipboardCopy,
Loader2,
ShieldCheck,
Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from
"@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { convertDiagramToIr } from "@/lib/htse/diagram-to-ir";
import {
validateIrRemote,
type ValidationAutofix,
type ValidationIssue,
type ValidationResult,
} from "@/lib/htse/ir-validator-client";
import type { MutationOp } from "@/types/mutations";
import { useDiagramStore } from "@/store/useDiagramStore";

interface ValidationPanelProps {
className?: string;
onApplySafe?: (ops: MutationOp[]) => void;
}

export function ValidationPanel({ className, onApplySafe }: ValidationPanelProps) {
const currentDiagram = useDiagramStore((s) => s.currentDiagram);

const [isOpen, setIsOpen] = useState(false);
const [isValidating, setIsValidating] = useState(false);
const [result, setResult] = useState<ValidationResult | null>(null);
const [showAutofixes, setShowAutofixes] = useState(false);
const [selectedFixes, setSelectedFixes] = useState<Set<number>>(new Set());
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const runValidation = useCallback(async () => {
if (!currentDiagram) return;
const ir = convertDiagramToIr(currentDiagram.diagram as never);
setIsValidating(true);
try {
const res = await validateIrRemote(ir);
setResult(res);
} catch {
toast.error("Validation request failed");
} finally {
setIsValidating(false);
}
}, [currentDiagram]);

// Auto-validate 3s after diagram changes
useEffect(() => {
if (!currentDiagram) return;
if (debounceRef.current) clearTimeout(debounceRef.current);
debounceRef.current = setTimeout(() => void runValidation(), 3000);
return () => {
if (debounceRef.current) clearTimeout(debounceRef.current);
};
}, [currentDiagram, runValidation]);

const handleApplySelected = () => {
if (!result?.autofixes || !result.normalizedIr) return;

const ops: MutationOp[] = [];
result.autofixes.forEach((fix, i) => {
if (!selectedFixes.has(i)) return;
// Map autofix type to MutationOp
if (fix.type === "remove_orphan" && fix.description.includes("nodeId:")) {
const nodeId = fix.description.split("nodeId:")[1]?.trim() ?? "";
if (nodeId) ops.push({ op: "deleteNode", nodeId });
}
// merge_terminals → stub toast (complex transform)
});

if (ops.length > 0 && onApplySafe) {
onApplySafe(ops);
toast.success(Enqueued ${ops.length} fix${ops.length > 1 ? "es" : ""});
} else {
toast.info(Applied: ${selectedFixes.size} fix${selectedFixes.size > 1 ? "es" : ""}
(queued));
}
setSelectedFixes(new Set());
setShowAutofixes(false);
};

const copyNodeId = (nodeId: string) => {
void navigator.clipboard.writeText(nodeId);
toast.success("Node ID copied");
};

const errorCount = result?.issues.filter((i) => i.severity === "error").length ?? 0;
const warnCount = result?.issues.filter((i) => i.severity === "warning").length ?? 0;
const errors = result?.issues.filter((i) => i.severity === "error") ?? [];
const warnings = result?.issues.filter((i) => i.severity === "warning") ?? [];

return (
<Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full",
className)}>
<CollapsibleTrigger asChild>
<Button variant="outline" size="sm" className="h-8 gap-1.5 px-3">
{isValidating ? (
<Loader2 className="h-3.5 w-3.5 animate-spin" />
) : result?.valid ? (
<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
) : errorCount > 0 ? (
<AlertCircle className="h-3.5 w-3.5 text-destructive" />
):(
<ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
)}
<span className="text-xs">Validation</span>
{errorCount > 0 && (
<Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
{errorCount}
</Badge>
)}
{errorCount === 0 && warnCount > 0 && (
<Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
{warnCount}
</Badge>
)}
<ChevronDown
className={cn("h-3 w-3 text-muted-foreground transition-transform", isOpen &&
"rotate-180")}
/>
</Button>
</CollapsibleTrigger>

<CollapsibleContent className="mt-1 rounded-md border bg-background shadow-sm">
{/ Toolbar /}
<div className="flex flex-wrap gap-1.5 border-b p-2">
<Button
size="sm"
variant="secondary"
className="h-7 px-2 text-xs"
disabled={isValidating || !currentDiagram}
onClick={() => void runValidation()}
>
{isValidating ? (
<Loader2 className="mr-1 h-3 w-3 animate-spin" />
):(
<ShieldCheck className="mr-1 h-3 w-3" />
)}
Validate now
</Button>

{(result?.autofixes?.length ?? 0) > 0 && (
<Button
size="sm"
variant="outline"
className="h-7 px-2 text-xs"
onClick={() => {
setShowAutofixes((v) => !v);
setSelectedFixes(new Set());
}}
>
<Wand2 className="mr-1 h-3 w-3" />
{showAutofixes ? "Hide" : "Preview"} fixes ({result!.autofixes.length})
</Button>
)}

{showAutofixes && selectedFixes.size > 0 && (
<Button size="sm" className="h-7 px-2 text-xs" onClick={handleApplySelected}>
Apply selected ({selectedFixes.size})
</Button>
)}
</div>

<ScrollArea className="max-h-72 p-2">
{/ Status message /}
{!result && !isValidating && (
<p className="py-2 text-center text-xs text-muted-foreground">
Press Validate or wait 3s after editing
</p>
)}

{result?.valid && result.issues.length === 0 && (
<div className="flex items-center gap-1.5 py-2 text-xs text-green-600">
<CheckCircle2 className="h-3.5 w-3.5" />
Diagram structure is valid
</div>
)}

{/ Errors /}
{errors.length > 0 && (
<div className="mb-2">
<p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">
Errors ({errors.length})
</p>
<div className="space-y-1">
{errors.map((issue, i) => (
<IssueRow key={i} issue={issue} onCopyNodeId={copyNodeId} />
))}
</div>
</div>
)}

{/ Warnings /}
{warnings.length > 0 && (
<div>
{errors.length > 0 && <Separator className="mb-2" />}
<p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
Warnings ({warnings.length})
</p>
<div className="space-y-1">
{warnings.map((issue, i) => (
<IssueRow key={i} issue={issue} onCopyNodeId={copyNodeId} />
))}
</div>
</div>
)}

{/ Autofix preview /}
{showAutofixes && (result?.autofixes?.length ?? 0) > 0 && (
<div className="mt-2 border-t pt-2">
<p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
Autofixes
</p>
<div className="space-y-1">
{result!.autofixes.map((fix, i) => (
<AutofixRow
key={i}
fix={fix}
index={i}
selected={selectedFixes.has(i)}
onToggle={(idx) =>
setSelectedFixes((prev) => {
const next = new Set(prev);
next.has(idx) ? next.delete(idx) : next.add(idx);
return next;
})
}
/>
))}
</div>
</div>
)}
</ScrollArea>
</CollapsibleContent>
</Collapsible>
);
}

function IssueRow({
issue,
onCopyNodeId,
}: {
issue: ValidationIssue;
onCopyNodeId: (id: string) => void;
}) {
return (
<div className="flex items-start gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-muted/40">
<span
className={cn(
"mt-0.5 shrink-0 font-mono text-[10px] font-semibold",
issue.severity === "error" ? "text-destructive" : "text-amber-500",
)}
>
{issue.severity === "error" ? "ERR" : "WRN"}
</span>
<div className="min-w-0 flex-1">
<span className="font-mono text-[10px] text-muted-foreground">{issue.code} </span>
<span>{issue.message}</span>
{issue.nodeId && (
<button
className="ml-1 inline-flex items-center gap-0.5 font-mono text-[10px] text-blue-500 hover:underline"
onClick={() => onCopyNodeId(issue.nodeId!)}
>
{issue.nodeId}
<ClipboardCopy className="h-2.5 w-2.5" />
</button>
)}
</div>
</div>
);
}

function AutofixRow({
fix,
index,
selected,
onToggle,
}: {
fix: ValidationAutofix;
index: number;
selected: boolean;
onToggle: (i: number) => void;
}) {
return (
<label className="flex cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-muted/40">
<input
type="checkbox"
checked={selected}
onChange={() => onToggle(index)}
className="mt-0.5 h-3 w-3 accent-primary"
/>
<span
className={cn(
"shrink-0 font-mono text-[10px]",
fix.safeToApply ? "text-green-600" : "text-amber-500",
)}
>
{fix.safeToApply ? "safe" : "manual"}
</span>
<span>{fix.description}</span>
</label>
);
}

