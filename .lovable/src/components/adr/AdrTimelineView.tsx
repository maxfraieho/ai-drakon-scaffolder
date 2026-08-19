import { useState, useEffect, useMemo } from 'react';
import { type AdrRecord, type AdrStatus, fetchAllAdrs } from '@/lib/adr/parser';

/** Status color mapping using Astryx tokens */
const statusConfig: Record<string, { label: string; className: string }> = {
  proposed: {
    label: 'Proposed',
    className: 'astryx-badge primary',
  },
  accepted: {
    label: 'Accepted',
    className: 'astryx-badge success',
  },
  deprecated: {
    label: 'Deprecated',
    className: 'astryx-badge',
  },
  superseded: {
    label: 'Superseded',
    className: 'astryx-badge',
  },
  rejected: {
    label: 'Rejected',
    className: 'astryx-badge',
  },
};

function StatusBadge({ status }: { status: AdrStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.proposed;
  return <span className={cfg.className}>{cfg.label}</span>;
}

interface AdrTimelineViewProps {
  onSelectAdr?: (adr: AdrRecord) => void;
}

export function AdrTimelineView({ onSelectAdr }: AdrTimelineViewProps) {
  const [adrs, setAdrs] = useState<AdrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AdrStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllAdrs()
      .then(setAdrs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = adrs;
    if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q) ||
          a.number.includes(q)
      );
    }
    return result;
  }, [adrs, filterStatus, searchQuery]);

  // Build supersedes/superseded-by lookup
  const links = useMemo(() => {
    const map = new Map<string, AdrRecord>();
    for (const a of adrs) map.set(a.number, a);
    return map;
  }, [adrs]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--astryx-text-muted)' }}>
        Завантаження ADR...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--astryx-text-muted)' }}>
        Помилка: {error}
      </div>
    );
  }

  const statuses: (AdrStatus | 'all')[] = ['all', 'proposed', 'accepted', 'deprecated', 'superseded', 'rejected'];

  return (
    <div
      className="astryx-app-shell"
      style={{
        height: 'auto',
        minHeight: '100vh',
        background: 'var(--astryx-surface-page)',
        fontFamily: 'var(--astryx-font-sans)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 32px 16px',
          borderBottom: '1px solid var(--astryx-border-subtle)',
          background: 'var(--astryx-surface-primary)',
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--astryx-text-primary)',
            margin: 0,
          }}
        >
          📋 ADR Timeline
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--astryx-text-secondary)',
            marginTop: 4,
          }}
        >
          Architecture Decision Records — хронологія архітектурних рішень
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {statuses.map((s) => (
            <button
              key={s}
              className={`astryx-button sm ${filterStatus === s ? 'primary' : 'ghost'}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'Усі' : (statusConfig[s]?.label ?? s)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <input
            type="text"
            placeholder="Пошук по ADR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              height: 28,
              padding: '0 10px',
              fontSize: 12,
              border: '1px solid var(--astryx-border-subtle)',
              borderRadius: 'var(--astryx-radius-sm)',
              background: 'var(--astryx-surface-secondary)',
              color: 'var(--astryx-text-primary)',
              fontFamily: 'var(--astryx-font-sans)',
              minWidth: 180,
            }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--astryx-text-muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>
            Нічого не знайдено
          </p>
        )}

        {filtered.map((adr, i) => {
          const supersededByAdr = adr.supersededBy
            ? links.get(adr.supersededBy.replace(/\D/g, '').padStart(4, '0'))
            : null;
          const supersedesAdr = adr.supersedes
            ? links.get(adr.supersedes.replace(/\D/g, '').padStart(4, '0'))
            : null;

          return (
            <div
              key={adr.number}
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: i < filtered.length - 1 ? 0 : undefined,
              }}
            >
              {/* Timeline line */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 24,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor:
                      adr.status === 'accepted'
                        ? '#2ea043'
                        : adr.status === 'proposed'
                          ? 'var(--astryx-color-brand)'
                          : 'var(--astryx-text-muted)',
                    border: '2px solid var(--astryx-surface-primary)',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                />
                {i < filtered.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      backgroundColor: 'var(--astryx-border-subtle)',
                      minHeight: 24,
                    }}
                  />
                )}
              </div>

              {/* Card */}
              <div
                onClick={() => onSelectAdr?.(adr)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  marginBottom: 16,
                  borderRadius: 'var(--astryx-radius-md)',
                  background: 'var(--astryx-surface-primary)',
                  border: '1px solid var(--astryx-border-subtle)',
                  boxShadow: 'var(--astryx-shadow-card)',
                  cursor: onSelectAdr ? 'pointer' : 'default',
                  textDecoration: adr.status === 'superseded' ? 'line-through' : 'none',
                  opacity: adr.status === 'superseded' || adr.status === 'deprecated' ? 0.7 : 1,
                  transition: 'box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--astryx-shadow-dropdown)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--astryx-shadow-card)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: 'var(--astryx-font-mono)',
                      fontSize: 11,
                      color: 'var(--astryx-text-muted)',
                    }}
                  >
                    ADR-{adr.number}
                  </span>
                  <StatusBadge status={adr.status} />
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--astryx-text-muted)',
                      marginLeft: 'auto',
                    }}
                  >
                    {adr.date}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--astryx-text-primary)',
                    lineHeight: 1.3,
                  }}
                >
                  {adr.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--astryx-text-muted)',
                    marginTop: 4,
                  }}
                >
                  {adr.deciders}
                </div>

                {/* Supersedes/superseded-by links */}
                {(supersedesAdr || supersededByAdr) && (
                  <div style={{ marginTop: 8, fontSize: 11, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {supersedesAdr && (
                      <span style={{ color: 'var(--astryx-color-brand)' }}>
                        ↑ замінює ADR-{supersedesAdr.number}
                      </span>
                    )}
                    {supersededByAdr && (
                      <span style={{ color: 'var(--astryx-text-muted)' }}>
                        ↓ замінено ADR-{supersededByAdr.number}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
