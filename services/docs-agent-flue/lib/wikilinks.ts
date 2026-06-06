export const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

export function parseWikilinks(content: string): string[] {
  const noFence = content.replace(/```[\s\S]*?```/g, '');
  const noInline = noFence.replace(/`[^`]+`/g, '');
  const links: string[] = [];
  let match;
  WIKILINK_RE.lastIndex = 0;
  while ((match = WIKILINK_RE.exec(noInline)) !== null) {
    if (match[1] && match[1].trim()) {
      links.push(match[1].trim());
    }
  }
  return links;
}

export function getSlugFromPath(path: string, basePath: string): string {
  const cleanPath = path.replace(/^\//, '');
  const cleanBase = basePath.replace(/^\//, '').replace(/\/$/, '');
  let rel = cleanPath;
  if (cleanBase && cleanPath.startsWith(cleanBase + '/')) {
    rel = cleanPath.slice(cleanBase.length + 1);
  }
  return rel.replace(/\.md$/, '').replace(/\\/g, '/');
}

export function pathFromSlug(slug: string, basePath: string): string {
  const cleanBase = basePath.replace(/^\//, '').replace(/\/$/, '');
  const cleanSlug = slug.replace(/^\//, '').replace(/\.md$/, '');
  const relativePath = `${cleanSlug}.md`;
  return cleanBase ? `${cleanBase}/${relativePath}` : relativePath;
}

interface NoteFile {
  path: string;
  slug: string;
  content: string;
  originalContent: string;
}

export function restructureWikiGraph(
  files: { path: string; content: string }[],
  basePath: string = 'docs'
): { path: string; content: string; changed: boolean }[] {
  const noteFiles: NoteFile[] = files.map(f => ({
    path: f.path,
    slug: getSlugFromPath(f.path, basePath),
    content: f.content,
    originalContent: f.content
  }));

  const slugSet = new Set(noteFiles.map(nf => nf.slug));
  const slugToNote = new Map<string, NoteFile>();
  for (const nf of noteFiles) {
    slugToNote.set(nf.slug, nf);
  }

  // Group by subdirectory
  const dirToFiles = new Map<string, NoteFile[]>();
  for (const nf of noteFiles) {
    const parts = nf.slug.split('/');
    const sub = parts.length > 1 ? parts[0] : '_root';
    if (!dirToFiles.has(sub)) {
      dirToFiles.set(sub, []);
    }
    dirToFiles.get(sub)!.push(nf);
  }

  // Sort files in each folder
  const numPattern = /^\d+/;
  function getSortKey(nf: NoteFile): [number, number, string] {
    const parts = nf.slug.split('/');
    const name = parts[parts.length - 1];
    const match = name.match(numPattern);
    if (match) {
      return [0, parseInt(match[0], 10), name];
    }
    return [1, 0, name];
  }

  function compareSortKeys(a: [number, number, string], b: [number, number, string]): number {
    if (a[0] !== b[0]) return a[0] - b[0];
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[2].localeCompare(b[2]);
  }

  const seqMap = new Map<string, string>();
  for (const [sub, folderNotes] of dirToFiles.entries()) {
    // Sort folderNotes
    folderNotes.sort((a, b) => {
      return compareSortKeys(getSortKey(a), getSortKey(b));
    });

    for (let i = 0; i < folderNotes.length - 1; i++) {
      const curr = folderNotes[i];
      const next = folderNotes[i + 1];
      const currName = curr.slug.split('/').pop() || '';
      const nextName = next.slug.split('/').pop() || '';
      if (numPattern.test(currName) && numPattern.test(nextName)) {
        seqMap.set(curr.slug, next.slug);
      }
    }
  }

  for (const nf of noteFiles) {
    const filename = nf.path.split('/').pop() || '';
    if (filename === 'INDEX.md' || filename === '_INDEX.md') {
      continue;
    }

    const parts = nf.slug.split('/');
    let parent: string | null = null;
    if (parts.length === 1) {
      parent = parts[0] === 'INDEX' ? null : 'INDEX';
    } else {
      const subDir = parts[0];
      const idxSlug = `${subDir}/_INDEX`;
      const readmeSlug = `${subDir}/README`;
      if (slugSet.has(idxSlug)) {
        parent = idxSlug;
      } else if (slugSet.has(readmeSlug)) {
        parent = readmeSlug;
      } else {
        parent = 'INDEX';
      }
    }

    const nextSeq = seqMap.get(nf.slug) || null;
    const linksSectionMatch = nf.content.match(/## Семантичні зв'язки[\s\S]*/);
    const existingRelated: string[] = [];

    if (linksSectionMatch) {
      const sectionText = linksSectionMatch[0];
      let match;
      WIKILINK_RE.lastIndex = 0;
      while ((match = WIKILINK_RE.exec(sectionText)) !== null) {
        if (match[1]) {
          let flClean = match[1].split('|')[0].trim();
          if (flClean.startsWith('docs/')) {
            flClean = flClean.slice(5);
          }
          if (
            flClean !== parent &&
            !flClean.includes('INDEX') &&
            flClean !== nextSeq &&
            flClean !== nf.slug
          ) {
            existingRelated.push(flClean);
          }
        }
      }
    }

    const seen = new Set<string>();
    const dedupedRelated: string[] = [];
    for (const r of existingRelated) {
      if (!seen.has(r) && slugSet.has(r)) {
        seen.add(r);
        dedupedRelated.push(r);
      }
    }

    const maxRelated = nextSeq ? 1 : 2;
    const selectedRelated = dedupedRelated.slice(0, maxRelated);

    let newSection = "## Семантичні зв'язки\n";
    if (parent) {
      newSection += `**Цей документ є частиною:** [[${parent}]]\n\n`;
    }

    newSection += "**Цей документ пов'язаний з:**\n";
    let hasLinks = false;

    if (nextSeq) {
      const nextNote = slugToNote.get(nextSeq);
      const nextNameClean = nextNote
        ? nextNote.path.split('/').pop()?.replace('.md', '').replace(/_/g, ' ').replace(/-/g, ' ') || nextSeq
        : nextSeq;
      newSection += `- [[${nextSeq}]] — наступний розділ (${nextNameClean})\n`;
      hasLinks = true;
    }

    for (const r of selectedRelated) {
      const rNote = slugToNote.get(r);
      const rNameClean = rNote
        ? rNote.path.split('/').pop()?.replace('.md', '').replace(/_/g, ' ').replace(/-/g, ' ') || r
        : r;
      newSection += `- [[${r}]] — пов'язаний документ (${rNameClean})\n`;
      hasLinks = true;
    }

    if (!hasLinks && parent) {
      newSection += `- [[${parent}]] — переглянути всі документи розділу\n`;
    }

    let updatedContent = nf.content;
    if (nf.content.includes("## Семантичні зв'язки")) {
      updatedContent = nf.content.replace(/## Семантичні зв'язки[\s\S]*/, newSection.trim());
    } else {
      updatedContent = nf.content.trim() + "\n\n" + newSection.trim();
    }

    nf.content = updatedContent;
  }

  return noteFiles.map(nf => ({
    path: nf.path,
    content: nf.content,
    changed: nf.content !== nf.originalContent
  }));
}
