/**
 * Diff analyzer — maps changed files to knowledge graph impact.
 * Standalone port of @understand-anything/core diff-analyzer.
 */
import type { KnowledgeGraph, GraphNode, GraphEdge, Layer } from "./types";

export interface DiffContext {
  projectName: string;
  changedFiles: string[];
  changedNodes: GraphNode[];
  affectedNodes: GraphNode[];
  impactedEdges: GraphEdge[];
  affectedLayers: Layer[];
  unmappedFiles: string[];
}

export function buildDiffContext(
  graph: KnowledgeGraph,
  changedFiles: string[]
): DiffContext {
  const { nodes, edges, layers } = graph;
  const changedNodeIds = new Set<string>();
  const unmappedFiles: string[] = [];

  for (const file of changedFiles) {
    let mapped = false;
    for (const node of nodes) {
      if (node.filePath === file) {
        changedNodeIds.add(node.id);
        mapped = true;
      }
    }
    if (!mapped) unmappedFiles.push(file);
  }

  // Include "contains" children
  for (const edge of edges) {
    if (edge.type === "contains" && changedNodeIds.has(edge.source)) {
      changedNodeIds.add(edge.target);
    }
  }

  const changedNodes = nodes.filter((n) => changedNodeIds.has(n.id));

  // 1-hop affected nodes
  const affectedNodeIds = new Set<string>();
  const impactedEdges: GraphEdge[] = [];

  for (const edge of edges) {
    const srcChanged = changedNodeIds.has(edge.source);
    const tgtChanged = changedNodeIds.has(edge.target);
    if (srcChanged || tgtChanged) {
      impactedEdges.push(edge);
      if (srcChanged && !changedNodeIds.has(edge.target)) affectedNodeIds.add(edge.target);
      if (tgtChanged && !changedNodeIds.has(edge.source)) affectedNodeIds.add(edge.source);
    }
  }

  const affectedNodes = nodes.filter((n) => affectedNodeIds.has(n.id));
  const allIds = new Set([...changedNodeIds, ...affectedNodeIds]);
  const affectedLayers = layers.filter((l) => l.nodeIds.some((id) => allIds.has(id)));

  return {
    projectName: graph.project.name,
    changedFiles,
    changedNodes,
    affectedNodes,
    impactedEdges,
    affectedLayers,
    unmappedFiles,
  };
}

export function formatDiffAnalysis(ctx: DiffContext): string {
  const lines: string[] = [];
  lines.push(`# Diff Analysis: ${ctx.projectName}`);
  lines.push("");

  lines.push("## Changed Components");
  lines.push("");
  if (ctx.changedNodes.length === 0) {
    lines.push("No mapped components found for changed files.");
  } else {
    for (const node of ctx.changedNodes) {
      lines.push(`- **${node.name}** (${node.type}) — ${node.summary}`);
    }
  }
  lines.push("");

  lines.push("## Affected Components");
  lines.push("");
  if (ctx.affectedNodes.length === 0) {
    lines.push("No downstream impact detected.");
  } else {
    for (const node of ctx.affectedNodes) {
      lines.push(`- **${node.name}** (${node.type}) — ${node.summary}`);
    }
  }
  lines.push("");

  lines.push("## Risk Assessment");
  lines.push("");
  const complex = ctx.changedNodes.filter((n) => n.complexity === "complex");
  const layerCount = new Set(ctx.affectedLayers.map((l) => l.id)).size;
  if (complex.length > 0) lines.push(`- ⚠️ ${complex.length} complex component(s) changed`);
  if (layerCount > 1) lines.push(`- ⚠️ Cross-layer impact: ${layerCount} layers`);
  if (ctx.affectedNodes.length > 5) lines.push(`- ⚠️ Wide blast radius: ${ctx.affectedNodes.length} affected`);
  if (ctx.unmappedFiles.length > 0) lines.push(`- ℹ️ ${ctx.unmappedFiles.length} unmapped files`);
  if (complex.length === 0 && layerCount <= 1 && ctx.affectedNodes.length <= 5) {
    lines.push("- ✅ Low risk: changes are localized.");
  }
  lines.push("");

  return lines.join("\n");
}
