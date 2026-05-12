// Project / folder / git helpers built on the MCP client.
import { mcpCall } from "@/lib/mcp/client";

export function sanitizeDiagramId(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_\-]/g, "")
    .slice(0, 80) || "untitled";
}

interface ListDiagramsResult {
  folderSlug?: string;
  diagrams?: Array<string | { id?: string; path?: string; folderSlug?: string }>;
}

/**
 * Lists distinct project folder slugs by calling drakon.listdiagrams with
 * an empty folderSlug (worker returns everything) and extracting the first
 * path segment of each entry.
 */
export async function listProjects(): Promise<string[]> {
  try {
    const res = await mcpCall<ListDiagramsResult>("drakon.listdiagrams", {
      folderSlug: "",
    });
    const items = res?.diagrams ?? [];
    const set = new Set<string>();
    for (const item of items) {
      let key = "";
      if (typeof item === "string") {
        key = item;
      } else if (item && typeof item === "object") {
        key = item.folderSlug || item.path || item.id || "";
      }
      if (!key) continue;
      const first = key.replace(/^\/+/, "").split("/")[0];
      if (first) set.add(first);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  } catch (err) {
    console.warn("[mcp.listProjects] failed:", err);
    return [];
  }
}

export async function saveDiagramToMinio(
  folderSlug: string,
  diagramId: string,
  diagram: unknown,
): Promise<void> {
  await mcpCall("drakon.savediagram", {
    folderSlug,
    diagramId,
    diagram,
  });
}

export interface SaveToGitArgs {
  owner: string;
  repo: string;
  branch: string;
  diagramId: string;
  diagram: unknown;
  token: string;
}

export interface SaveToGitResult {
  path?: string;
  commitSha?: string;
  commitUrl?: string;
}

export async function saveDiagramToGit(args: SaveToGitArgs): Promise<SaveToGitResult> {
  const { token, ...rest } = args;
  const res = await mcpCall<SaveToGitResult>(
    "drakon.savetogit",
    rest,
    { githubToken: token },
  );
  return res || {};
}

export function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  const m = input.trim().match(/^([^\s/]+)\/([^\s/]+)$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}
