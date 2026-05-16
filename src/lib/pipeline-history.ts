export interface GenerationHistoryItem {
  id: string;
  timestamp: number;
  scheme: string;
  language: string;
  description: string;
  code: string;
  iterations: number;
  elapsed: number;
}

const KEY = "drakon:generation-history";
const MAX = 20;

export function saveGenerationHistory(
  item: Omit<GenerationHistoryItem, "id" | "timestamp">,
): void {
  const history = loadGenerationHistory();
  const updated = [
    { ...item, id: crypto.randomUUID(), timestamp: Date.now() },
    ...history,
  ].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    /* noop */
  }
}

export function loadGenerationHistory(): GenerationHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
