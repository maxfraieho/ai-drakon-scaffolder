import { useState, useEffect } from 'react';
import { type AdrRecord, type AdrStatus, fetchAdr, ADR_FILES } from '@/lib/adr/parser';

/** Status color mapping */
const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  proposed: { bg: 'var(--astryx-color-brand-light)', color: 'var(--astryx-color-brand)', label: 'Proposed' },
  accepted: { bg: 'rgba(46, 160, 67, 0.15)', color: '#2ea043', label: 'Accepted' },
  deprecated: { bg: 'var(--astryx-surface-secondary)', color: 'var(--astryx-text-muted)', label: 'Deprecated' },
  superseded: { bg: 'var(--astryx-surface-secondary)', color: 'var(--astryx-text-muted)', label: 'Superseded' },
  rejected: { bg: 'var(--astryx-surface-secondary)', color: 'var(--astryx-text-muted)', label: 'Rejected' },
};

function ImmutabilityBanner({ status, supersededBy }: { status: AdrStatus; supersededBy: string | null }) {
  if (status === 'accepted' || status.toString().includes('accepted')) {
    return (
      <div
        style={{
          padding: '8px 16px',
          background: 'var(--astryx-color-brand-light)',
          borderRadius: 'var(--astryx-radius-sm)',
          fontSize: 13,
          color: 'var(--astryx-color-brand)',
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        ⚠ Цей ADR прийнятий і не підлягає редагуванню
      </div>
    );
  }

  if (status === 'superseded' && supersededBy) {
    return (
      <div
        style={{
          padding: '8px 16px',
          background: 'var(--astryx-surface-secondary)',
          borderRadius: 'var(--astryx-radius-sm)',
          fontSize: 13,
          color: 'var(--astryx-text-muted)',
          marginBottom: 16,
        }}
      >
        ↗ Цей ADR замінено на{' '}
        <a
          href={`/adr?view=${supersededBy.replace(/\D/g, '').padStart(4, '0')}`}
          style={{ color: 'var(--astryx-color-brand)', textDecoration: 'underline' }}
        >
          {supersededBy}
        </a>
      </div>
    );
  }

  return null;
}

/**
 * Render markdown body with basic formatting:
 * - Headers (## / ###)
 * - Inline SVG images (![alt](url)) rendered as <img>
 * - Deep-links [▶ text](url) rendered as links
 * - Code blocks
 * - Lists
 * - Tables (basic)
 */
function MarkdownBody({ body, slug }: { body: string; slug: string }) {
  const lines = body.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={i}
            style={{
              background: 'var(--astryx-surface-secondary)',
              padding: 12,
              borderRadius: 'var(--astryx-radius-sm)',
              fontSize: 12,
              fontFamily: 'var(--astryx-font-mono)',
              overflow: 'auto',
              margin: '8px 0',
              color: 'var(--astryx-text-primary)',
            }}
          >
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--astryx-text-primary)',
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          {line.slice(4)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--astryx-text-primary)',
            marginTop: 24,
            marginBottom: 8,
            borderBottom: '1px solid var(--astryx-border-subtle)',
            paddingBottom: 4,
          }}
        >
          {line.slice(3)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      // Skip H1 — rendered separately as title
      continue;
    }

    // SVG images: ![alt](path)
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const [, alt, src] = imgMatch;
      const resolvedSrc = src.startsWith('./') ? `/docs/adr/${src.slice(2)}` : src;
      elements.push(
        <div key={i} style={{ margin: '16px 0', textAlign: 'center' }}>
          <img
            src={resolvedSrc}
            alt={alt}
            style={{
              maxWidth: '100%',
              borderRadius: 'var(--astryx-radius-md)',
              border: '1px solid var(--astryx-border-subtle)',
            }}
          />
          {alt && (
            <div style={{ fontSize: 11, color: 'var(--astryx-text-muted)', marginTop: 4 }}>{alt}</div>
          )}
        </div>
      );
      continue;
    }

    // Deep link: [▶ text](url)
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && line.trim().startsWith('[▶')) {
      const [, text, href] = linkMatch;
      elements.push(
        <div key={i} style={{ margin: '8px 0' }}>
          <a
            href={href}
            className="astryx-button sm primary"
            style={{ textDecoration: 'none', display: 'inline-flex' }}
          >
            {text}
          </a>
        </div>
      );
      continue;
    }

    // List items
    if (line.match(/^\s*[\*\-]\s/)) {
      const text = line.replace(/^\s*[\*\-]\s+/, '');
      elements.push(
        <li
          key={i}
          style={{
            fontSize: 13,
            color: 'var(--astryx-text-primary)',
            lineHeight: 1.6,
            marginLeft: 16,
          }}
        >
          {text}
        </li>
      );
      continue;
    }

    // Table rows (basic)
    if (line.startsWith('|')) {
      // Collect table rows
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      i = j - 1;

      const rows = tableLines.filter((l) => !l.match(/^\|[\s\-:]+\|/));
      if (rows.length > 0) {
        const headers = rows[0].split('|').filter(Boolean).map((c) => c.trim());
        const dataRows = rows.slice(1).map((r) => r.split('|').filter(Boolean).map((c) => c.trim()));

        elements.push(
          <div key={i} style={{ overflowX: 'auto', margin: '12px 0' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                fontFamily: 'var(--astryx-font-sans)',
              }}
            >
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderBottom: '2px solid var(--astryx-border-subtle)',
                        color: 'var(--astryx-text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid var(--astryx-border-subtle)',
                          color: 'var(--astryx-text-primary)',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Regular paragraph
    elements.push(
      <p
        key={i}
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--astryx-text-primary)',
          margin: '4px 0',
        }}
      >
        {line}
      </p>
    );
  }

  return <div>{elements}</div>;
}

interface AdrViewerProps {
  /** ADR slug (filename without .md) or number */
  adrSlug?: string;
  /** Pre-loaded ADR record */
  adr?: AdrRecord;
  /** Callback to go back */
  onBack?: () => void;
}

export function AdrViewer({ adrSlug, adr: preloaded, onBack }: AdrViewerProps) {
  const [adr, setAdr] = useState<AdrRecord | null>(preloaded ?? null);
  const [loading, setLoading] = useState(!preloaded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preloaded) {
      setAdr(preloaded);
      setLoading(false);
      return;
    }
    if (!adrSlug) return;

    // Find matching filename
    const match = ADR_FILES.find(
      (f) => f.filename.replace(/\.md$/, '') === adrSlug || f.number === adrSlug
    );
    if (!match) {
      setError(`ADR not found: ${adrSlug}`);
      setLoading(false);
      return;
    }

    fetchAdr(match.filename)
      .then(setAdr)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [adrSlug, preloaded]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--astryx-text-muted)' }}>
        Завантаження...
      </div>
    );
  }

  if (error || !adr) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--astryx-text-muted)' }}>
        {error ?? 'ADR не знайдено'}
      </div>
    );
  }

  const ss = statusStyles[adr.status] ?? statusStyles.proposed;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--astryx-surface-page)',
        fontFamily: 'var(--astryx-font-sans)',
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '24px 32px',
        }}
      >
        {/* Back button */}
        {onBack && (
          <button
            className="astryx-button sm ghost"
            onClick={onBack}
            style={{ marginBottom: 16 }}
          >
            ← До Timeline
          </button>
        )}

        {/* Immutability banner */}
        <ImmutabilityBanner status={adr.status} supersededBy={adr.supersededBy} />

        {/* Frontmatter badges */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--astryx-font-mono)',
              fontSize: 12,
              color: 'var(--astryx-text-muted)',
            }}
          >
            ADR-{adr.number}
          </span>
          <span
            className="astryx-badge"
            style={{
              backgroundColor: ss.bg,
              color: ss.color,
            }}
          >
            {ss.label}
          </span>
          <span
            className="astryx-badge"
            style={{
              backgroundColor: 'var(--astryx-surface-secondary)',
              color: 'var(--astryx-text-secondary)',
            }}
          >
            📅 {adr.date}
          </span>
          {adr.deciders && (
            <span
              className="astryx-badge"
              style={{
                backgroundColor: 'var(--astryx-surface-secondary)',
                color: 'var(--astryx-text-secondary)',
              }}
            >
              👥 {adr.deciders}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--astryx-text-primary)',
            lineHeight: 1.3,
            marginBottom: 20,
          }}
        >
          {adr.title}
        </h1>

        {/* Body */}
        <div
          style={{
            background: 'var(--astryx-surface-primary)',
            borderRadius: 'var(--astryx-radius-md)',
            border: '1px solid var(--astryx-border-subtle)',
            padding: '20px 24px',
            boxShadow: 'var(--astryx-shadow-card)',
          }}
        >
          <MarkdownBody body={adr.body} slug={adr.slug} />
        </div>
      </div>
    </div>
  );
}
