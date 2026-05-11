import type { Diagram } from "@/types/drakon";

const DIAGRAMS_STORAGE_KEY = "drakon.diagrams";

export function readDiagramsFromStorage(): Diagram[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DIAGRAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Diagram[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDiagramsToStorage(diagrams: Diagram[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DIAGRAMS_STORAGE_KEY, JSON.stringify(diagrams));
}

export function upsertDiagramInStorage(diagram: Diagram) {
  const current = readDiagramsFromStorage();
  const index = current.findIndex((item) => item.id === diagram.id);

  if (index === -1) {
    writeDiagramsToStorage([diagram, ...current]);
    return;
  }

  current[index] = diagram;
  writeDiagramsToStorage(current);
}

export function removeDiagramFromStorage(diagramId: string) {
  const current = readDiagramsFromStorage();
  writeDiagramsToStorage(current.filter((item) => item.id !== diagramId));
}
