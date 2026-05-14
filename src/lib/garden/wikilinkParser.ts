// Parse [[wiki-link]] or [[wiki-link|alias]] syntax
export interface ParsedWikilink {
  raw: string;
  slug: string;
  alias?: string;
  start: number;
  end: number;
}

export function parseWikilinks(text: string): ParsedWikilink[] {
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const out: ParsedWikilink[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({
      raw: m[0],
      slug: m[1].trim(),
      alias: m[2]?.trim(),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}

// Detect if cursor is inside an unclosed [[ trigger; returns query string
export function detectWikilinkTrigger(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const open = before.lastIndexOf("[[");
  if (open === -1) return null;
  const close = before.indexOf("]]", open);
  if (close !== -1 && close < cursor) return null;
  const between = before.slice(open + 2);
  if (/[\n\]]/.test(between)) return null;
  return { query: between, start: open };
}
