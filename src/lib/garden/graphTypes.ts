export interface NoteListItem {
  slug: string;
  path: string;
  sha?: string;
  title?: string;
}

export interface NoteContent {
  slug: string;
  path: string;
  title: string;
  content: string;
  tags: string[];
  sha?: string;
}

export interface WikilinkSuggestion {
  title: string;
  slug: string;
}

export interface GraphNode {
  slug: string;
  title: string;
  exists: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  type?: "navigational" | "tag" | string;
}

export interface NoteLink {
  target: string;
  alias?: string;
}

export function getRootFolder(slug: string): string {
  const idx = slug.indexOf("/");
  return idx === -1 ? "_root" : slug.slice(0, idx);
}
