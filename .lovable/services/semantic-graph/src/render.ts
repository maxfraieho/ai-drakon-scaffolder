import { Article } from './collect';

// renderSemanticBlock: creates "## Семантичні зв'язки" markdown section
export function renderSemanticBlock(rels: {link: string; target_id: string}[], articles: Article[]): string {
  if (rels.length === 0) return '';
  const lines = rels.map(r => {
    const target = articles.find(a => a.slug === r.target_id);
    const title = target?.title || r.target_id;
    return `- ${r.link}: [[${r.target_id}|${title}]]`;
  });
  return `## Семантичні зв'язки\n\n${lines.join('\n')}\n`;
}

// upsertSemanticSection: inserts or replaces "## Семантичні зв'язки" section in markdown content
export function upsertSemanticSection(content: string, newBlock: string): string {
  const sectionRegex = /\n## Семантичні зв'язки[\s\S]*?(?=\n## |\n---|\n#[^#]|$)/;
  if (sectionRegex.test(content)) {
    return content.replace(sectionRegex, newBlock ? `\n${newBlock}` : '');
  }
  return content.trimEnd() + '\n\n' + newBlock;
}
