import { readDiagramsFromStorage } from "@/lib/diagram-storage";
import type { Diagram } from "@/types/drakon";
import type { DiagramLevel } from "@/types/diagram-metadata";

export type DiagramWithContext = Diagram & {
context: {
level: DiagramLevel | null;
sourceType: "human" | "ai" | "hybrid";
};
};

export type DiagramTreeNode = {
diagram: Diagram;
children: DiagramTreeNode[];
};

export function getDiagramLevel(name: string): DiagramLevel | null {
const normalized = String(name || "").trim().toLowerCase();
if (normalized.startsWith("system.")) return "L0";
if (normalized.startsWith("module.")) return "L1";
if (normalized.startsWith("flow.")) return "L2";
if (normalized.startsWith("procedure.")) return "L3";
return null;
}

export async function resolveDiagramContext(nameOrId: string): Promise<DiagramWithContext
| null> {
const needle = String(nameOrId || "").trim().toLowerCase();
if (!needle) return null;

const diagrams = readDiagramsFromStorage();
const found = diagrams.find(
(d) => d.id.toLowerCase() === needle || d.name.toLowerCase() === needle,
);
if (!found) return null;

return {
...found,
context: {
level: found.diagram.metadata?.diagramLevel ?? getDiagramLevel(found.name),
sourceType: found.diagram.metadata?.sourceType ?? "human",
},
};
}

export function buildDiagramTree(diagrams: Diagram[]): DiagramTreeNode[] {
const byId = new Map<string, DiagramTreeNode>();
const roots: DiagramTreeNode[] = [];

diagrams.forEach((diagram) => {
byId.set(diagram.id, { diagram, children: [] });
});

diagrams.forEach((diagram) => {
const node = byId.get(diagram.id);
if (!node) return;

const parentId = diagram.diagram.metadata?.parentDiagramId;
if (parentId && byId.has(parentId)) {
byId.get(parentId)?.children.push(node);
return;
}

roots.push(node);
});

return roots;
}

export function findDiagramsByFilePath(filePath: string, diagrams: Diagram[]): Diagram[] {
const needle = String(filePath || "").trim().toLowerCase();
if (!needle) return diagrams;

return diagrams.filter((diagram) =>
(diagram.diagram.metadata?.filePaths ?? []).some((path) =>
path.toLowerCase().includes(needle)),
);
}

