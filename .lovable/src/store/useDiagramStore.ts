import { create } from "zustand";

import { api } from "@/lib/api";
import { upsertDiagramInStorage } from "@/lib/diagram-storage";
import type { Diagram, EditDelta, GenerateResult } from "@/types/drakon";

interface DiagramStore {
  currentDiagram: Diagram | null;
  metrics: GenerateResult["metrics"] | null;
  isDirty: boolean;
  isSaving: boolean;
  setDiagram: (d: Diagram) => void;
  setMetrics: (m: GenerateResult["metrics"] | null) => void;
  applyDelta: (delta: EditDelta) => void;
  saveDiagram: () => Promise<void>;
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  currentDiagram: null,
  metrics: null,
  isDirty: false,
  isSaving: false,

  setDiagram: (diagram) => {
    set({ currentDiagram: diagram, isDirty: false });
  },

  setMetrics: (metrics) => {
    set({ metrics });
  },

  applyDelta: (delta) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    const items = { ...currentDiagram.diagram.items };

    if (delta.type === "delete") {
      delete items[delta.itemId];
    }

    if (delta.type === "insert" || delta.type === "update") {
      const prev = items[delta.itemId] ?? {
        type: "action" as const,
        content: "",
      };

      items[delta.itemId] = {
        ...prev,
        ...(delta.data ?? {}),
      };
    }

    set({
      currentDiagram: {
        ...currentDiagram,
        updatedAt: new Date().toISOString(),
        diagram: {
          ...currentDiagram.diagram,
          items,
        },
      },
      isDirty: true,
    });
  },

  saveDiagram: async () => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({ isSaving: true });

    try {
      await api.commit(currentDiagram.folderId, currentDiagram.id, currentDiagram);
      upsertDiagramInStorage({ ...currentDiagram, updatedAt: new Date().toISOString() });
      set({ isDirty: false });
    } finally {
      set({ isSaving: false });
    }
  },
}));
