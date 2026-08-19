/**
 * ADR Parser — parses MADR v3.x frontmatter from ADR markdown files.
 * Used by AdrTimelineView and AdrViewer components.
 */

export type AdrStatus = 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded' | string;

export interface AdrRecord {
  /** ADR number, e.g. "0015" */
  number: string;
  /** Full title from H1 */
  title: string;
  /** Normalized status */
  status: AdrStatus;
  /** Raw status string from frontmatter */
  statusRaw: string;
  /** Date from frontmatter */
  date: string;
  /** Deciders */
  deciders: string;
  /** Spec reference */
  spec: string | null;
  /** Supersedes which ADR */
  supersedes: string | null;
  /** Superseded by which ADR */
  supersededBy: string | null;
  /** Filename without extension */
  slug: string;
  /** Full markdown body (after frontmatter) */
  body: string;
  /** Original filename */
  filename: string;
}

/**
 * Parse YAML frontmatter from ADR markdown content.
 */
export function parseFrontmatter(content: string): Record<string, string | null> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, string | null> = {};

  for (const line of yaml.split('\n')) {
    const kv = line.match(/^(\S+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    // Remove quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val === 'null' || val === '' ? null : val;
  }

  return result;
}

/**
 * Normalize status string to a canonical AdrStatus.
 */
export function normalizeStatus(raw: string | null): AdrStatus {
  if (!raw) return 'proposed';
  const lower = raw.toLowerCase();
  if (lower.includes('superseded')) return 'superseded';
  if (lower.includes('deprecated')) return 'deprecated';
  if (lower.includes('accepted')) return 'accepted';
  if (lower.includes('rejected')) return 'rejected';
  if (lower.includes('proposed')) return 'proposed';
  return raw;
}

/**
 * Extract H1 title from markdown body.
 */
function extractTitle(body: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Parse a single ADR markdown string into AdrRecord.
 */
export function parseAdr(content: string, filename: string): AdrRecord {
  const fm = parseFrontmatter(content);
  const bodyStart = content.indexOf('---', 3);
  const body = bodyStart > 0 ? content.slice(content.indexOf('\n', bodyStart) + 1) : content;

  const number = filename.match(/^(\d{4})/)?.[1] ?? '0000';
  const slug = filename.replace(/\.md$/, '');

  return {
    number,
    title: extractTitle(body),
    status: normalizeStatus(fm.status ?? null),
    statusRaw: fm.status ?? '',
    date: fm.date ?? '',
    deciders: fm.deciders ?? '',
    spec: fm.spec ?? null,
    supersedes: fm.supersedes ?? null,
    supersededBy: fm['superseded-by'] ?? null,
    slug,
    body,
    filename,
  };
}

/**
 * Hardcoded ADR data — parsed at build time from docs/adr/*.md.
 * In a real SSR setup these would be loaded from filesystem.
 * For client-side, we import them as raw strings.
 */
export const ADR_FILES: { filename: string; number: string }[] = [
  { filename: '0001-appwrite-student-plan-backend.md', number: '0001' },
  { filename: '0002-cloudflare-workers-routing-auth.md', number: '0002' },
  { filename: '0003-gitnexus-code-knowledge-graph.md', number: '0003' },
  { filename: '0004-mempalace-vector-memory-sessions.md', number: '0004' },
  { filename: '0005-three-fastapi-microservices.md', number: '0005' },
  { filename: '0006-lovable-mirror-sync-build-contract.md', number: '0006' },
  { filename: '0007-tanstack-start-routetree-contract.md', number: '0007' },
  { filename: '0008-arbiter-promotion-policy.md', number: '0008' },
  { filename: '0009-astryx-canonical-design-system.md', number: '0009' },
  { filename: '0010-langgraph-agent-orchestration.md', number: '0010' },
  { filename: '0011-repository-semantic-graph.md', number: '0011' },
  { filename: '0012-bidirectional-drakon-ir.md', number: '0012' },
  { filename: '0013-single-github-project-config.md', number: '0013' },
  { filename: '0014-pilot-project-vydra-swiss-survey.md', number: '0014' },
  { filename: '0015-drakon-embedded-adr-documentation.md', number: '0015' },
];

/**
 * Fetch and parse an ADR file from the /docs/adr/ path.
 */
export async function fetchAdr(filename: string): Promise<AdrRecord> {
  const resp = await fetch(`/docs/adr/${filename}`);
  if (!resp.ok) throw new Error(`Failed to fetch ADR: ${filename}`);
  const content = await resp.text();
  return parseAdr(content, filename);
}

/**
 * Fetch and parse all ADR files.
 */
export async function fetchAllAdrs(): Promise<AdrRecord[]> {
  const results = await Promise.allSettled(
    ADR_FILES.map((f) => fetchAdr(f.filename))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<AdrRecord> => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => a.number.localeCompare(b.number));
}
