import type { Diagram } from "@/types/drakon";
import { withDiagramMetadataDefaults } from "@/types/diagram-metadata";

function normalizeDiagram(diagram: Diagram): Diagram {
return {
...diagram,
diagram: {
...diagram.diagram,
items: diagram.diagram?.items ?? {},
metadata: withDiagramMetadataDefaults(diagram.diagram?.metadata),
},
};
}

const DIAGRAMS_STORAGE_KEY = "drakon.diagrams";

export function readDiagramsFromStorage(): Diagram[] {
if (typeof window === "undefined") return [];
try {
const raw = localStorage.getItem(DIAGRAMS_STORAGE_KEY);
if (!raw) return [];
const parsed = JSON.parse(raw) as Diagram[];
return Array.isArray(parsed) ? parsed.map(normalizeDiagram) : [];
} catch {
return [];
}
}

export function writeDiagramsToStorage(diagrams: Diagram[]) {
if (typeof window === "undefined") return;
localStorage.setItem(
DIAGRAMS_STORAGE_KEY,
JSON.stringify(diagrams.map(normalizeDiagram)),
);
}

export function upsertDiagramInStorage(diagram: Diagram) {
const normalized = normalizeDiagram(diagram);
const current = readDiagramsFromStorage();
const index = current.findIndex((item) => item.id === normalized.id);

if (index === -1) {
writeDiagramsToStorage([normalized, ...current]);
return;
}

current[index] = normalized;
writeDiagramsToStorage(current);
}

export function removeDiagramFromStorage(diagramId: string) {
const current = readDiagramsFromStorage();
writeDiagramsToStorage(current.filter((item) => item.id !== diagramId));
}

