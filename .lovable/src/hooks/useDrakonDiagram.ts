// src/hooks/useDrakonDiagram.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { readDiagramsFromStorage, removeDiagramFromStorage, upsertDiagramInStorage } from "@/lib/diagram-storage";
import { useDiagramStore } from "@/store/useDiagramStore";
import { withDiagramMetadataDefaults } from "@/types/diagram-metadata";
import type { Diagram } from "@/types/drakon";

type SaveInput = {
  diagramId: string;
  diagram: unknown;
  name?: string;
  isNew?: boolean;
};

const getDiagramStorageKey = (diagramId: string) => `diagram_${diagramId}`;

function normalizeDiagram(folderSlug: string | undefined, data: SaveInput): Diagram {
  const now = new Date().toISOString();
  const raw = (data.diagram ?? {}) as Record<string, unknown>;
  const nested = ((raw.diagram as Record<string, unknown> | undefined) ?? raw) as unknown as Diagram["diagram"];
  const name = data.name ?? (raw.name as string) ?? "Untitled";

  return {
    id: data.diagramId,
    name,
    folderId: folderSlug ?? "default",
    createdAt: (raw.createdAt as string) ?? now,
    updatedAt: now,
    diagram: {
      ...nested,
      name,
      items: nested?.items ?? {},
      metadata: withDiagramMetadataDefaults(nested?.metadata),
    },
  };
}

export function useDrakonDiagram(folderSlug: string, diagramId: string) {
  return useQuery<Diagram>({
    queryKey: ["drakon-diagram", folderSlug, diagramId],
    queryFn: async () => {
      if (typeof window === "undefined") {
        throw new Error("Diagram storage is only available in browser");
      }

      const key = getDiagramStorageKey(diagramId);
      const local = localStorage.getItem(key);
      if (local) {
        const parsed = JSON.parse(local) as Diagram;
        useDiagramStore.getState().setDiagram(parsed);
        return parsed;
      }

      try {
        const remote = await api.getDiagram(folderSlug, diagramId);
        const parsed = remote.diagram as Diagram;

        if (!remote.success || !parsed) {
          throw new Error("Diagram not found");
        }

        localStorage.setItem(key, JSON.stringify(parsed));
        useDiagramStore.getState().setDiagram(parsed);
        return parsed;
      } catch {
        const fallback = readDiagramsFromStorage().find((item) => item.id === diagramId);
        if (!fallback) {
          throw new Error("Diagram not found");
        }

        localStorage.setItem(key, JSON.stringify(fallback));
        useDiagramStore.getState().setDiagram(fallback);
        return fallback;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveDrakonDiagram(folderSlug?: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; diagram: Diagram }, Error, SaveInput>({
    mutationFn: async (variables) => {
      if (typeof window === "undefined") {
        throw new Error("Saving is only available in browser");
      }

      const savedDiagram = normalizeDiagram(folderSlug, variables);

      localStorage.setItem(getDiagramStorageKey(variables.diagramId), JSON.stringify(savedDiagram));
      upsertDiagramInStorage(savedDiagram);
      await api.commit(savedDiagram.folderId, variables.diagramId, {
        id: variables.diagramId,
        name: savedDiagram.diagram.name,
        folderId: savedDiagram.folderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        diagram: savedDiagram.diagram,
      });

      return { success: true, diagram: savedDiagram };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drakon-diagram", folderSlug, variables.diagramId] });
      useDiagramStore.getState().setDiagram(result.diagram);
      toast.success("Схему збережено");
    },
    onError: (error) => {
      toast.error(error.message || "Не вдалося зберегти схему");
    },
  });
}

export function useDeleteDrakonDiagram(folderSlug: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (diagramId: string) => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(getDiagramStorageKey(diagramId));
      }
      removeDiagramFromStorage(diagramId);
      await api.deleteDiagram(folderSlug, diagramId);
      return { success: true };
    },
    onSuccess: (_result, diagramId) => {
      queryClient.invalidateQueries({ queryKey: ["drakon-diagram", folderSlug, diagramId] });
      toast.success("Схему видалено");
    },
    onError: (error) => {
      toast.error(error.message || "Не вдалося видалити схему");
    },
  });
}
