/**
 * Agent context helper — loads knowledge graph from GitHub repo
 * and builds relevant context for DRAKON agent prompts.
 */
import type { KnowledgeGraph } from "./types";
import { buildChatContext, formatContextForPrompt } from "./context";

const KG_PATH = ".understand-anything/knowledge-graph.json";

/**
 * Try to load knowledge graph from a GitHub repo via API.
 * Returns null if not found.
 */
export async function loadKnowledgeGraph(
  owner: string,
  repo: string,
  token: string,
  branch: string = "main"
): Promise<KnowledgeGraph | null> {
  // 1. Try fetching from GitHub API if token and owner/repo are provided
  if (owner && repo && token) {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${KG_PATH}?ref=${branch}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.raw+json",
        },
      });
      if (res.ok) {
        const text = await res.text();
        return JSON.parse(text) as KnowledgeGraph;
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // 2. Fallback to local / relative path
  try {
    const localRes = await fetch(`/${KG_PATH}`);
    if (localRes.ok) {
      const text = await localRes.text();
      return JSON.parse(text) as KnowledgeGraph;
    }
  } catch {
    // Fall through
  }

  // 3. Fallback to API route
  try {
    const apiRes = await fetch(`/api/knowledge-graph`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.nodes) return data as KnowledgeGraph;
    }
  } catch {
    // Fall through
  }

  return null;
}


/**
 * Get formatted context string for an agent prompt.
 * Returns empty string if no knowledge graph is available.
 */
export async function getAgentContext(
  owner: string,
  repo: string,
  token: string,
  query: string,
  maxNodes: number = 10
): Promise<string> {
  const graph = await loadKnowledgeGraph(owner, repo, token);
  if (!graph) return "";

  const ctx = buildChatContext(graph, query, maxNodes);
  return formatContextForPrompt(ctx);
}
