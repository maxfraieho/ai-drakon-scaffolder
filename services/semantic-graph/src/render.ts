import { Article } from './collect';

export function renderSemanticBlock(rels: {link: string; target_id: string}[], articles: Article[]): string {
  if (rels.length === 0) return '';
  const lines = rels.map(r => {
    const target = articles.find(a => a.slug === r.target_id);
    const title = target?.title || r.target_id;
    return `- ${r.link}: [[${r.target_id}|${title}]]`;
  });
  return `## Семантичні зв'язки\n\n${lines.join('\n')}\n`;
}

// Returns [updatedContent, changed] tuple
export function upsertSemanticSection(content: string, newBlock: string): [string, boolean] {
  const sectionRegex = /\n## Семантичні зв'язки[\s\S]*?(?=\n## |\n---|\n#[^#]|$)/;
  const hasSection = sectionRegex.test(content);

  if (hasSection) {
    if (!newBlock) {
      return [content.replace(sectionRegex, ''), true];
    }
    const updated = content.replace(sectionRegex, `\n${newBlock}`);
    return [updated, updated !== content];
  }

  if (!newBlock) {
    return [content, false];
  }

  return [content.trimEnd() + '\n\n' + newBlock, true];
}
