export function parseFrontmatter(text: string): { frontmatter: Record<string, any> | null; content: string } {
  const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/;
  const match = text.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: null, content: text };
  }
  
  const fmText = match[1];
  const content = text.slice(match[0].length);
  const frontmatter: Record<string, any> = {};
  
  const lines = fmText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.slice(0, colonIndex).trim();
    let valStr = trimmed.slice(colonIndex + 1).trim();
    
    // Check if it's a bracketed list (like tags: [a, b])
    if (valStr.startsWith('[') && valStr.endsWith(']')) {
      const items = valStr.slice(1, -1).split(',')
        .map(item => {
          let itemTrimmed = item.trim();
          if ((itemTrimmed.startsWith('"') && itemTrimmed.endsWith('"')) || 
              (itemTrimmed.startsWith("'") && itemTrimmed.endsWith("'"))) {
            itemTrimmed = itemTrimmed.slice(1, -1);
          }
          return itemTrimmed;
        })
        .filter(Boolean);
      frontmatter[key] = items;
    } else {
      // Remove quotes if present
      if ((valStr.startsWith('"') && valStr.endsWith('"')) || 
          (valStr.startsWith("'") && valStr.endsWith("'"))) {
        valStr = valStr.slice(1, -1);
      }
      // Simple type conversions
      if (valStr.toLowerCase() === 'true') {
        frontmatter[key] = true;
      } else if (valStr.toLowerCase() === 'false') {
        frontmatter[key] = false;
      } else if (!isNaN(Number(valStr)) && valStr !== '') {
        frontmatter[key] = Number(valStr);
      } else {
        frontmatter[key] = valStr;
      }
    }
  }
  
  return { frontmatter, content };
}

export function buildFrontmatter(fm: Record<string, any>): string {
  let yaml = '---\n';
  for (const [key, value] of Object.entries(fm)) {
    if (key === 'file.name' || key === 'file.path') continue;
    if (Array.isArray(value)) {
      const listStr = value.map(v => `"${v}"`).join(', ');
      yaml += `${key}: [${listStr}]\n`;
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      yaml += `${key}: ${value}\n`;
    } else {
      yaml += `${key}: "${value}"\n`;
    }
  }
  yaml += '---\n\n';
  return yaml;
}

export function stripFrontmatter(text: string): string {
  const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/;
  return text.replace(frontmatterRegex, '').trim();
}
