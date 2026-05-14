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
