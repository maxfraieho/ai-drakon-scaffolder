import { getN8nConfig } from "@/lib/settings-storage";

export type DiagramChangedPayload = {
  event: "diagram_saved" | "diagram_deleted" | "diagram_created";
  diagramId: string;
  diagramName: string;
  folderId: string;
  timestamp: string;
  changedBy: "human" | "ai";
  mutationsApplied?: number;
  diagramLevel?: string;
};

export async function notifyDiagramChanged(payload: DiagramChangedPayload): Promise<void> {
  const cfg = getN8nConfig();
  if (!cfg.enabled || !cfg.webhookUrl) return;

  try {
    await fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    console.warn("[n8n] Failed to send diagram notification");
  }
}
