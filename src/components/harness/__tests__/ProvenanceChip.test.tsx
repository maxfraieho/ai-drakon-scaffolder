import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProvenanceChip } from '@/components/harness/ProvenanceChip';

// No jsdom / @testing-library in this repo (all existing tests are plain-function
// *.test.ts). ProvenanceChip is purely presentational, so we assert on its static
// markup via react-dom/server -- no DOM environment or new deps required.

describe('ProvenanceChip', () => {
  it('renders the label', () => {
    const html = renderToStaticMarkup(
      <ProvenanceChip label="runtime" title="from runtime" />,
    );
    expect(html).toContain('runtime');
  });

  it('renders the detail when provided', () => {
    const html = renderToStaticMarkup(
      <ProvenanceChip label="runtime" detail="policy-engine" title="from runtime" />,
    );
    expect(html).toContain('policy-engine');
    expect(html).toContain('opacity-70');
  });

  it('omits the detail span when detail is absent', () => {
    const html = renderToStaticMarkup(
      <ProvenanceChip label="canonical" title="canonical source" />,
    );
    expect(html).not.toContain('opacity-70');
  });

  it('sets the title attribute', () => {
    const html = renderToStaticMarkup(
      <ProvenanceChip label="indexed" title="Indexed from GitNexus graph" />,
    );
    expect(html).toContain('title="Indexed from GitNexus graph"');
  });

  it('sets data-variant to the label value', () => {
    const html = renderToStaticMarkup(
      <ProvenanceChip label="worker" title="from worker" />,
    );
    expect(html).toContain('data-variant="worker"');
  });

  it('always exposes the provenance-chip testid', () => {
    const html = renderToStaticMarkup(
      <ProvenanceChip label="runtime" title="from runtime" />,
    );
    expect(html).toContain('data-testid="provenance-chip"');
  });
});
