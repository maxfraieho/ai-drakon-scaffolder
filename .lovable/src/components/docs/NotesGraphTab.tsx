import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutionGraph } from "@/components/docs/garden/ExecutionGraph";
import { fetchNotesGraph } from "@/lib/garden/notesApi";
import type { GraphNode, GraphEdge } from "@/lib/garden/graphTypes";

interface NotesGraphTabProps {
onNodeClick?: (slug: string) => void;
}

export function NotesGraphTab({ onNodeClick }: NotesGraphTabProps) {
const [nodes, setNodes] = useState<GraphNode[]>([]);
const [edges, setEdges] = useState<GraphEdge[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadGraph = async () => {
setLoading(true);
setError(null);
try {
const data = await fetchNotesGraph();
setNodes(data.nodes);
setEdges(data.edges);
} catch (e) {
setError(e instanceof Error ? e.message : "Помилка завантаження графу");
} finally {
setLoading(false);
}
};

useEffect(() => {
void loadGraph();
}, []);

if (loading) {
return (
<div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/10 text-muted-foreground">
<Loader2 className="h-8 w-8 animate-spin" />
<div className="text-center text-sm">Завантаження графу знань…</div>
</div>
);
}

if (error) {
return (
<div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/10">
<p className="text-sm text-destructive">{error}</p>
<Button variant="outline" size="sm" onClick={loadGraph}>
<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
Спробувати знову
</Button>
</div>
);
}

if (nodes.length === 0) {
return (
<div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/10 text-muted-foreground">
<Network className="h-10 w-10 opacity-20" />
<p className="text-sm">Нотаток поки немає — додайте першу у вкладці "Нотатки"</p>
</div>
);
}

return (
<div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col gap-2">
<div className="flex items-center justify-between px-1">
<span className="text-xs text-muted-foreground">
{nodes.length} нотаток · {edges.length} посилань
</span>
<Button variant="ghost" size="sm" onClick={loadGraph}>
<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
Оновити
</Button>
</div>
<div className="min-h-0 flex-1">
<ExecutionGraph nodes={nodes} edges={edges} onNodeClick={onNodeClick} />
</div>
</div>
);
}

