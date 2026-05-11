import type { AnalysisSummary } from "@/types/analysis";
import type { Diagram } from "@/types/drakon";

export interface MatchedItem {
  symbolName: string;
  symbolType: "function" | "component" | "hook" | "class" | "store";
  diagramId: string;
  diagramName: string;
  matchType: "exact" | "fuzzy";
}

export interface MissingInDiagram {
  symbolName: string;
  symbolType: "function" | "component" | "hook" | "class" | "store";
  filePath: string;
  suggestedDiagramName: string;
}

export interface MissingInCode {
  diagramId: string;
  diagramName: string;
  lastModified: string;
  possibleReason: "deleted" | "renamed" | "unknown";
}

export interface NeedsHumanReview {
  diagramId: string;
  issue: string;
  context: string;
}

export interface DiffStats {
  totalSymbols: number;
  totalDiagrams: number;
  matchedCount: number;
  coveragePercent: number;
}

export interface CodeDiagramDiff {
  matched: MatchedItem[];
  missingInDiagram: MissingInDiagram[];
  missingInCode: MissingInCode[];
  needsHumanReview: NeedsHumanReview[];
  stats: DiffStats;
}

function toKebab(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "");
}

function fuzzyScore(a: string, b: string): number {
  const ka = toKebab(a);
  const kb = toKebab(b);
  if (ka === kb) return 1;
  if (ka.includes(kb) || kb.includes(ka)) {
    const shorter = Math.min(ka.length, kb.length);
    const longer = Math.max(ka.length, kb.length);
    return shorter / longer;
  }
  return 0;
}

function suggestDiagramName(
  symbolName: string,
  symbolType: MissingInDiagram["symbolType"],
): string {
  const level =
    symbolType === "component" ? "module"
    : symbolType === "function" || symbolType === "hook" ? "flow"
    : "procedure";
  return `${level}.${toKebab(symbolName)}`;
}

interface SymbolEntry {
  name: string;
  filePath: string;
  type: MissingInDiagram["symbolType"];
}

function extractSymbols(summary: AnalysisSummary): SymbolEntry[] {
  const entries: SymbolEntry[] = [];
  summary.functions?.forEach((f) =>
    entries.push({ name: f.name, filePath: f.filePath, type: "function" }),
  );
  summary.components?.forEach((c) =>
    entries.push({ name: c.name, filePath: c.filePath, type: "component" }),
  );
  summary.hooks?.forEach((h) =>
    entries.push({ name: h.name, filePath: h.filePath, type: "hook" }),
  );
  summary.classes?.forEach((c) =>
    entries.push({ name: c.name, filePath: c.filePath, type: "class" }),
  );
  summary.stores?.forEach((s) =>
    entries.push({ name: s.name, filePath: s.filePath, type: "store" }),
  );
  return entries;
}

const FUZZY_THRESHOLD = 0.6;

export function compareAnalysisToDiagram(
  summary: AnalysisSummary,
  diagrams: Diagram[],
): CodeDiagramDiff {
  const symbols = extractSymbols(summary);
  const matched: MatchedItem[] = [];
  const matchedSymbolNames = new Set<string>();
  const matchedDiagramIds = new Set<string>();
  const needsHumanReview: NeedsHumanReview[] = [];

  // Flag low-confidence diagrams for human review
  for (const d of diagrams) {
    const meta = d.diagram.metadata;
    const level = meta?.diagramLevel;
    if (level === "L2" || level === "L3") {
      if (!meta?.symbolRefs?.length) {
        needsHumanReview.push({
          diagramId: d.id,
          issue: "No symbolRefs in metadata",
          context: `L${level} diagram "${d.name}" has no linked code symbols`,
        });
      }
      if (meta?.confidenceScore !== undefined && meta.confidenceScore < 0.5) {
        needsHumanReview.push({
          diagramId: d.id,
          issue: "Low confidence score",
          context: `Score ${meta.confidenceScore} for diagram "${d.name}"`,
        });
      }
    }
  }

  for (const sym of symbols) {
    // 1. Exact match via symbolRefs
    const exactDiagram = diagrams.find((d) =>
      d.diagram.metadata?.symbolRefs?.includes(sym.name),
    );
    if (exactDiagram) {
      matched.push({
        symbolName: sym.name,
        symbolType: sym.type,
        diagramId: exactDiagram.id,
        diagramName: exactDiagram.name,
        matchType: "exact",
      });
      matchedSymbolNames.add(sym.name);
      matchedDiagramIds.add(exactDiagram.id);
      continue;
    }

    // 2. Fuzzy match via diagram name
    let bestDiagram: Diagram | null = null;
    let bestScore = 0;
    for (const d of diagrams) {
      const score = fuzzyScore(sym.name, d.name);
      if (score > bestScore) {
        bestScore = score;
        bestDiagram = d;
      }
    }
    if (bestDiagram && bestScore >= FUZZY_THRESHOLD) {
      matched.push({
        symbolName: sym.name,
        symbolType: sym.type,
        diagramId: bestDiagram.id,
        diagramName: bestDiagram.name,
        matchType: "fuzzy",
      });
      matchedSymbolNames.add(sym.name);
      matchedDiagramIds.add(bestDiagram.id);
    }
  }

  const missingInDiagram: MissingInDiagram[] = symbols
    .filter((s) => !matchedSymbolNames.has(s.name))
    .map((s) => ({
      symbolName: s.name,
      symbolType: s.type,
      filePath: s.filePath,
      suggestedDiagramName: suggestDiagramName(s.name, s.type),
    }));

  const missingInCode: MissingInCode[] = diagrams
    .filter((d) => {
      const level = d.diagram.metadata?.diagramLevel;
      return (level === "L2" || level === "L3") && !matchedDiagramIds.has(d.id);
    })
    .map((d) => ({
      diagramId: d.id,
      diagramName: d.name,
      lastModified: d.updatedAt,
      possibleReason: "unknown" as const,
    }));

  const totalSymbols = symbols.length;
  const matchedCount = matched.length;
  const coveragePercent =
    totalSymbols > 0 ? Math.round((matchedCount / totalSymbols) * 100) : 0;

  return {
    matched,
    missingInDiagram,
    missingInCode,
    needsHumanReview,
    stats: { totalSymbols, totalDiagrams: diagrams.length, matchedCount, coveragePercent },
  };
}
