import { describe, it, expect, vi } from 'vitest';
import {
  DiagramRepository,
  KnowledgeZoneRepository,
  PipelineRunRepository,
  HarnessSpecRepository,
  McpToolAuditRepository,
  type D1Database,
} from '../repositories';

/**
 * ADR-0025 §4: "Every route has an integration test proving tenant A
 * cannot read tenant B's data. A route without that test does not
 * merge." This is the package-level version of that mandate: prove that
 * every repository query is scoped to the tenantId bound at construction
 * time, regardless of what a caller passes to the method -- there is no
 * parameter path that lets a caller read/write a different tenant's row.
 */

function fakeDb(): { db: D1Database; prepare: ReturnType<typeof vi.fn> } {
  const bind = vi.fn().mockReturnThis();
  const first = vi.fn().mockResolvedValue(null);
  const all = vi.fn().mockResolvedValue({ results: [], success: true });
  const run = vi.fn().mockResolvedValue({ results: [], success: true });
  const statement = { bind, first, all, run };
  const prepare = vi.fn().mockReturnValue(statement);
  return { db: { prepare } as unknown as D1Database, prepare };
}

describe('DiagramRepository -- tenant isolation', () => {
  it('list() always binds the constructor tenantId, never a caller-supplied one', async () => {
    const { db, prepare } = fakeDb();
    const repo = new DiagramRepository(db, 'tenant-a');
    await repo.list('some-project');

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = ?'));
    const statement = prepare.mock.results[0].value;
    expect(statement.bind).toHaveBeenCalledWith('tenant-a', 'some-project');
  });

  it('get() cannot be made to read a different tenant -- there is no tenant parameter on the method', async () => {
    const { db, prepare } = fakeDb();
    const repo = new DiagramRepository(db, 'tenant-a');
    // The only way this test could fail to prove isolation is if get()
    // accepted a second, tenant-shaped argument -- it doesn't; TypeScript
    // itself rejects `repo.get('some-id', 'tenant-b')` at compile time.
    await repo.get('some-diagram-id');

    const statement = prepare.mock.results[0].value;
    expect(statement.bind).toHaveBeenCalledWith('tenant-a', 'some-diagram-id');
  });

  it('two repository instances for two tenants never share a bound tenantId', async () => {
    const { db: dbA, prepare: prepareA } = fakeDb();
    const { db: dbB, prepare: prepareB } = fakeDb();
    const repoA = new DiagramRepository(dbA, 'tenant-a');
    const repoB = new DiagramRepository(dbB, 'tenant-b');

    await repoA.get('shared-id-string');
    await repoB.get('shared-id-string');

    expect(prepareA.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 'shared-id-string');
    expect(prepareB.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-b', 'shared-id-string');
  });

  it('create() binds tenantId from the constructor, not from the row payload', async () => {
    const { db, prepare } = fakeDb();
    const repo = new DiagramRepository(db, 'tenant-a');
    await repo.create({ id: 'd1', project_slug: 'p', name: 'n', ir_json: '{}' });

    const statement = prepare.mock.results[0].value;
    // Second bound argument is tenantId (from the constructor), not
    // anything present in the `row` object passed to create() -- row has
    // no tenant_id field at all (Omit<Diagram, 'tenant_id' | ...>).
    expect(statement.bind).toHaveBeenCalledWith('d1', 'tenant-a', 'p', 'n', '{}');
  });

  it('update() binds tenantId from the constructor and updates ir_json', async () => {
    const { db, prepare } = fakeDb();
    const repo = new DiagramRepository(db, 'tenant-a');
    await repo.update('d1', '{"updated":true}');

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE diagrams SET ir_json = ?'));
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = ? AND id = ?'));
    const statement = prepare.mock.results[0].value;
    expect(statement.bind).toHaveBeenCalledWith('{"updated":true}', 'tenant-a', 'd1');
  });

  it('upsert() creates a fresh row when the diagram does not exist', async () => {
    const { db, prepare } = fakeDb();
    const repo = new DiagramRepository(db, 'tenant-a');
    await repo.upsert({ id: 'd1', project_slug: 'p', name: 'n', ir_json: '{}' });

    // First query is get()
    expect(prepare).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT * FROM diagrams WHERE tenant_id = ? AND id = ?'));
    // Second query is create()
    expect(prepare).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO diagrams'));
    const createStatement = prepare.mock.results[1].value;
    expect(createStatement.bind).toHaveBeenCalledWith('d1', 'tenant-a', 'p', 'n', '{}');
  });

  it('upsert() updates ir_json when the diagram already exists', async () => {
    const bind = vi.fn().mockReturnThis();
    const first = vi.fn().mockResolvedValue({ id: 'd1', tenant_id: 'tenant-a', project_slug: 'p', name: 'n', ir_json: '{}' });
    const run = vi.fn().mockResolvedValue({ results: [], success: true });
    const statement = { bind, first, run };
    const prepare = vi.fn().mockReturnValue(statement);
    const db = { prepare } as unknown as D1Database;

    const repo = new DiagramRepository(db, 'tenant-a');
    await repo.upsert({ id: 'd1', project_slug: 'p', name: 'n', ir_json: '{"version":2}' });

    expect(prepare).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT * FROM diagrams WHERE tenant_id = ? AND id = ?'));
    expect(prepare).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE diagrams SET ir_json = ?'));
    expect(statement.bind).toHaveBeenCalledWith('{"version":2}', 'tenant-a', 'd1');
  });
});

describe('KnowledgeZoneRepository -- tenant isolation', () => {
  it('list() scopes to the constructor tenantId', async () => {
    const { db, prepare } = fakeDb();
    const repo = new KnowledgeZoneRepository(db, 'tenant-a');
    await repo.list();

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = ?'));
    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a');
  });
});

describe('PipelineRunRepository -- tenant isolation', () => {
  it('list() scopes to the constructor tenantId with the default limit', async () => {
    const { db, prepare } = fakeDb();
    const repo = new PipelineRunRepository(db, 'tenant-a');
    await repo.list();

    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 50);
  });

  it('get() scopes to the constructor tenantId regardless of run id', async () => {
    const { db, prepare } = fakeDb();
    const repo = new PipelineRunRepository(db, 'tenant-b');
    await repo.get('run-123');

    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-b', 'run-123');
  });
});

describe('HarnessSpecRepository -- tenant isolation', () => {
  it('list() scopes to the constructor tenantId', async () => {
    const { db, prepare } = fakeDb();
    const repo = new HarnessSpecRepository(db, 'tenant-a');
    await repo.list('architect');

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = ? AND agent_name = ?'));
    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 'architect');
  });

  it('get(id) always scopes to the constructor tenantId', async () => {
    const { db, prepare } = fakeDb();
    const repo = new HarnessSpecRepository(db, 'tenant-a');
    await repo.get('spec-123');

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = ? AND (id = ? OR agent_name = ?)'));
    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 'spec-123', 'spec-123');
  });

  it('two repository instances for two tenants never share a bound tenantId', async () => {
    const { db: dbA, prepare: prepareA } = fakeDb();
    const { db: dbB, prepare: prepareB } = fakeDb();
    const repoA = new HarnessSpecRepository(dbA, 'tenant-a');
    const repoB = new HarnessSpecRepository(dbB, 'tenant-b');

    await repoA.get('shared-spec');
    await repoB.get('shared-spec');

    expect(prepareA.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 'shared-spec', 'shared-spec');
    expect(prepareB.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-b', 'shared-spec', 'shared-spec');
  });

  it('create() binds tenantId from constructor, not from row object, and uses atomic ON CONFLICT upsert', async () => {
    const { db, prepare } = fakeDb();
    const repo = new HarnessSpecRepository(db, 'tenant-a');
    await repo.create({ id: 's1', agent_name: 'architect', version: '1.0.0', spec_json: '{}' });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO harness_specs'));
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id) DO UPDATE SET'));
    const statement = prepare.mock.results[0].value;
    expect(statement.bind).toHaveBeenCalledWith('s1', 'tenant-a', 'architect', '1.0.0', '{}');
  });

  it('update() binds tenantId from constructor and updates spec_json', async () => {
    const { db, prepare } = fakeDb();
    const repo = new HarnessSpecRepository(db, 'tenant-a');
    await repo.update('s1', '{"updated":true}');

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE harness_specs SET spec_json = ?'));
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = ? AND id = ?'));
    const statement = prepare.mock.results[0].value;
    expect(statement.bind).toHaveBeenCalledWith('{"updated":true}', 'tenant-a', 's1');
  });

  it('upsert() executes atomic ON CONFLICT insert without separate read query', async () => {
    const { db, prepare } = fakeDb();
    const repo = new HarnessSpecRepository(db, 'tenant-a');
    await repo.upsert({ id: 's1', agent_name: 'architect', version: '1.0.0', spec_json: '{}' });

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO harness_specs'));
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT(id) DO UPDATE SET'));
    const createStatement = prepare.mock.results[0].value;
    expect(createStatement.bind).toHaveBeenCalledWith('s1', 'tenant-a', 'architect', '1.0.0', '{}');
  });
});

describe('McpToolAuditRepository -- tenant isolation', () => {
  it('record() binds constructor tenantId, specId, toolName, and granted flag', async () => {
    const { db, prepare } = fakeDb();
    const repo = new McpToolAuditRepository(db, 'tenant-a');
    await repo.record('spec-arch', 'drakon.getdiagram', true, 'audit-1');

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO mcp_tool_call_audit'));
    const statement = prepare.mock.results[0].value;
    expect(statement.bind).toHaveBeenCalledWith('audit-1', 'tenant-a', 'spec-arch', 'drakon.getdiagram', 1);
  });

  it('record() auto-generates a UUID id when none is provided', async () => {
    const { db, prepare } = fakeDb();
    const repo = new McpToolAuditRepository(db, 'tenant-a');
    await repo.record('spec-arch', 'drakon.savediagram', false);

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO mcp_tool_call_audit'));
    const statement = prepare.mock.results[0].value;
    const boundArgs = statement.bind.mock.calls[0];
    expect(boundArgs[0]).toEqual(expect.any(String));
    expect(boundArgs[0].length).toBeGreaterThan(0);
    expect(boundArgs[1]).toBe('tenant-a');
    expect(boundArgs[2]).toBe('spec-arch');
    expect(boundArgs[3]).toBe('drakon.savediagram');
    expect(boundArgs[4]).toBe(0);
  });

  it('two repository instances for two tenants never share a bound tenantId', async () => {
    const { db: dbA, prepare: prepareA } = fakeDb();
    const { db: dbB, prepare: prepareB } = fakeDb();
    const repoA = new McpToolAuditRepository(dbA, 'tenant-a');
    const repoB = new McpToolAuditRepository(dbB, 'tenant-b');

    await repoA.record('spec-1', 'tool-1', true, 'row-1');
    await repoB.record('spec-1', 'tool-1', true, 'row-2');

    expect(prepareA.mock.results[0].value.bind).toHaveBeenCalledWith('row-1', 'tenant-a', 'spec-1', 'tool-1', 1);
    expect(prepareB.mock.results[0].value.bind).toHaveBeenCalledWith('row-2', 'tenant-b', 'spec-1', 'tool-1', 1);
  });

  it('listRecent() scopes to constructor tenantId with default limit', async () => {
    const { db, prepare } = fakeDb();
    const repo = new McpToolAuditRepository(db, 'tenant-a');
    await repo.listRecent();

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE tenant_id = ? ORDER BY called_at DESC LIMIT ?'));
    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 50);
  });

  it('listRecent() passes custom limit', async () => {
    const { db, prepare } = fakeDb();
    const repo = new McpToolAuditRepository(db, 'tenant-a');
    await repo.listRecent(10);

    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 10);
  });

  it('listBySpec() scopes to constructor tenantId and specId', async () => {
    const { db, prepare } = fakeDb();
    const repo = new McpToolAuditRepository(db, 'tenant-a');
    await repo.listBySpec('spec-arch', 25);

    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining('WHERE tenant_id = ? AND spec_id = ? ORDER BY called_at DESC LIMIT ?')
    );
    expect(prepare.mock.results[0].value.bind).toHaveBeenCalledWith('tenant-a', 'spec-arch', 25);
  });
});

