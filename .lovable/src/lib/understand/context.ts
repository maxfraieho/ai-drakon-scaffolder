/**
 * Context builder — extracts relevant nodes from KnowledgeGraph
 * for use in DRAKON agent prompts.
 * Standalone port of @understand-anything/core context-builder.
 */
import type { KnowledgeGraph, GraphNode, GraphEdge, Layer } from "./types";

export interface ChatContext {
  projectName: string;
  projectDescription: string;
  languages: string[];
  frameworks: string[];
  relevantNodes: GraphNode[];
  relevantEdges: GraphEdge[];
  relevantLayers: Layer[];
  query: string;
}

/** Simple fuzzy search — match query words against node name, summary, tags */
function matchScore(node: GraphNode, queryWords: string[]): number {
  const text = `${node.name} ${node.summary} ${node.tags.join(" ")}`.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (text.includes(word)) score++;
  }
  return score;
}

/**
 * Build context by searching the knowledge graph for nodes relevant
 * to the user's query, expanding 1 hop via edges.
 */
export function buildChatContext(
  graph: KnowledgeGraph,
  query: string,
  maxNodes: number = 15
): ChatContext {
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Score and rank nodes
  const scored = graph.nodes
    .map((node) => ({ node, score: matchScore(node, queryWords) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxNodes);

  const matchedIds = new Set(scored.map((s) => s.node.id));

  // Expand 1 hop
  const expandedIds = new Set(matchedIds);
  for (const edge of graph.edges) {
    if (matchedIds.has(edge.source)) expandedIds.add(edge.target);
    if (matchedIds.has(edge.target)) expandedIds.add(edge.source);
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const relevantNodes: GraphNode[] = [];
  for (const id of expandedIds) {
    const node = nodeMap.get(id);
    if (node) relevantNodes.push(node);
  }

  const relevantEdges = graph.edges.filter(
    (e) => expandedIds.has(e.source) && expandedIds.has(e.target)
  );

  const relevantLayers = graph.layers.filter((layer) =>
    layer.nodeIds.some((id) => expandedIds.has(id))
  );

  return {
    projectName: graph.project.name,
    projectDescription: graph.project.description,
    languages: graph.project.languages,
    frameworks: graph.project.frameworks,
    relevantNodes,
    relevantEdges,
    relevantLayers,
    query,
  };
}

/** Format context as markdown string for LLM consumption */
export function formatContextForPrompt(context: ChatContext): string {
  const lines: string[] = [];
  lines.push(`# Project: ${context.projectName}`);
  lines.push("");
  lines.push(context.projectDescription);
  lines.push("");
  lines.push(`**Languages:** ${context.languages.join(", ")}`);
  lines.push(`**Frameworks:** ${context.frameworks.join(", ")}`);
  lines.push("");

  if (context.relevantLayers.length > 0) {
    lines.push("## Relevant Layers");
    lines.push("");
    for (const layer of context.relevantLayers) {
      lines.push(`### ${layer.name}`);
      lines.push(layer.description);
      lines.push("");
    }
  }

  if (context.relevantNodes.length > 0) {
    lines.push("## Code Components");
    lines.push("");
    for (const node of context.relevantNodes) {
      lines.push(`### ${node.name} (${node.type})`);
      if (node.filePath) lines.push(`- **File:** ${node.filePath}`);
      lines.push(`- **Complexity:** ${node.complexity}`);
      lines.push(`- **Summary:** ${node.summary}`);
      if (node.tags.length > 0) lines.push(`- **Tags:** ${node.tags.join(", ")}`);
      lines.push("");
    }
  }

  if (context.relevantEdges.length > 0) {
    const nodeMap = new Map(context.relevantNodes.map((n) => [n.id, n]));
    lines.push("## Relationships");
    lines.push("");
    for (const edge of context.relevantEdges) {
      const src = nodeMap.get(edge.source)?.name ?? edge.source;
      const tgt = nodeMap.get(edge.target)?.name ?? edge.target;
      let line = `- ${src} --[${edge.type}]--> ${tgt}`;
      if (edge.description) line += `: ${edge.description}`;
      lines.push(line);
    }
    lines.push("");
  }

  return lines.join("\n");
}
