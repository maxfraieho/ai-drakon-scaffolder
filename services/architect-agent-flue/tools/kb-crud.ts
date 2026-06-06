const ARCHITECTURE_PATTERNS = [
  // Core
  { id: 'p-layered', language: 'pattern', description: 'Layered Architecture',
    code: 'Classic three-tier: Presentation -> Business -> Data. Good enough for standard web apps.',
    ir_yaml: '...', tags: 'core,architecture,layered,three-tier' },
  { id: 'p-microservices', language: 'pattern', description: 'Microservices',
    code: 'Independent services, each owning its data. Use for scale, team autonomy.',
    ir_yaml: '...', tags: 'core,architecture,microservices,distributed' },
  { id: 'p-event-driven', language: 'pattern', description: 'Event-Driven Architecture',
    code: 'Async events via message broker. Use for decoupling, real-time processing.',
    ir_yaml: '...', tags: 'core,architecture,events,async' },
  { id: 'p-cqrs', language: 'pattern', description: 'CQRS',
    code: 'Separate read/write models. Use when reads and writes have different scaling needs.',
    ir_yaml: '...', tags: 'core,architecture,cqrs,data' },

  // Data Consistency
  { id: 'p-saga', language: 'pattern', description: 'Saga Pattern',
    code: 'Coordinates local transactions across multiple services using compensating transactions.',
    ir_yaml: '...', tags: 'data-consistency,saga,distributed-transactions' },
  { id: 'p-outbox', language: 'pattern', description: 'Transactional Outbox',
    code: 'Saves events to an outbox table in the same transaction as state changes, then publishes them asynchronously.',
    ir_yaml: '...', tags: 'data-consistency,outbox,async-events' },
  { id: 'p-event-sourcing', language: 'pattern', description: 'Event Sourcing',
    code: 'Persists state changes as a sequence of events, rebuilding state by replaying history.',
    ir_yaml: '...', tags: 'data-consistency,event-sourcing,history' },
  { id: 'p-idempotency', language: 'pattern', description: 'Idempotent Consumer',
    code: 'Ensures messages/requests are processed only once by tracking unique request IDs.',
    ir_yaml: '...', tags: 'data-consistency,idempotency,duplicate-protection' },

  // Migration
  { id: 'p-strangler-fig', language: 'pattern', description: 'Strangler Fig',
    code: 'Gradually replaces legacy system parts by routing traffic to new services step-by-step.',
    ir_yaml: '...', tags: 'migration,strangler-fig,legacy-modernization' },
  { id: 'p-parallel-run', language: 'pattern', description: 'Parallel Run',
    code: 'Runs legacy and new systems concurrently, comparing results to ensure correctness.',
    ir_yaml: '...', tags: 'migration,parallel-run,validation' },
  { id: 'p-branch-abstraction', language: 'pattern', description: 'Branch by Abstraction',
    code: 'Introduces an abstraction layer in code to gradually migrate implementation underneath without branching.',
    ir_yaml: '...', tags: 'migration,branch-by-abstraction,refactoring' },
  { id: 'p-shadow-traffic', language: 'pattern', description: 'Shadow Traffic',
    code: 'Duplicates live traffic to new system in parallel to test load and correctness without impacting production.',
    ir_yaml: '...', tags: 'migration,shadow-traffic,testing' },

  // Application
  { id: 'p-modular-monolith', language: 'pattern', description: 'Modular Monolith',
    code: 'Monolithic deployment with strictly separated logical modules, preparing for potential microservices.',
    ir_yaml: '...', tags: 'application,modular-monolith,cohesion' },
  { id: 'p-three-tier', language: 'pattern', description: 'Three-Tier Architecture',
    code: 'Standard application structure divided into Presentation, Application (Business Logic), and Database.',
    ir_yaml: '...', tags: 'application,three-tier,layered' },
  { id: 'p-offline-first', language: 'pattern', description: 'Offline-First',
    code: 'Designs app to function without internet, syncing state locally and pushing updates when online.',
    ir_yaml: '...', tags: 'application,offline-first,sync' },
  { id: 'p-local-first', language: 'pattern', description: 'Local-First',
    code: 'Prioritizes local storage and client ownership of data, syncing peer-to-peer or via central server.',
    ir_yaml: '...', tags: 'application,local-first,collaboration' },
  { id: 'p-ot-crdt', language: 'pattern', description: 'OT / CRDT',
    code: 'Conflict-free Replicated Data Types or Operational Transformation for collaborative real-time editing.',
    ir_yaml: '...', tags: 'application,crdt,ot,collaboration' },

  // AI Systems
  { id: 'p-rag', language: 'pattern', description: 'RAG Knowledge Base',
    code: 'Retrieval-Augmented Generation: vector DB + LLM. Use for AI doc search, Q&A.',
    ir_yaml: '...', tags: 'ai,rag,vector,knowledge-base' },
  { id: 'p-agent-workflow', language: 'pattern', description: 'AI Agent / Workflow',
    code: 'Tool-calling LLM with sandboxing. Use for autonomous coding, research agents.',
    ir_yaml: '...', tags: 'ai,agent,flue,workflows' },
  { id: 'p-inference-serving', language: 'pattern', description: 'Inference Serving',
    code: 'High-performance AI model hosting with dynamic batching, model caching, and streaming.',
    ir_yaml: '...', tags: 'ai,inference,model-serving,performance' },
];

export async function initKB(db: any): Promise<void> {
  // Create table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      language TEXT NOT NULL DEFAULT 'python',
      description TEXT NOT NULL DEFAULT '',
      code TEXT NOT NULL,
      ir_yaml TEXT NOT NULL,
      job_id TEXT,
      tags TEXT NOT NULL DEFAULT ''
    )
  `);

  // Check if seeded
  const check = await db.prepare('SELECT COUNT(*) as count FROM contributions WHERE language = ?').bind('pattern').first();
  if (check && (check as any).count > 0) {
    return;
  }

  // Seed data
  const ts = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(`
    INSERT INTO contributions (id, timestamp, language, description, code, ir_yaml, job_id, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = ARCHITECTURE_PATTERNS.map(p => 
    stmt.bind(p.id, ts, p.language, p.description, p.code, p.ir_yaml, null, p.tags)
  );

  await db.batch(batch);
}

export async function contributeToKB(
  db: any,
  code: string,
  irYaml: string,
  language: string = 'python',
  description: string = '',
  jobId: string | null = null,
  tags: string = ''
): Promise<{ id: string; timestamp: number }> {
  await initKB(db);
  const entryId = crypto.randomUUID();
  const ts = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO contributions (id, timestamp, language, description, code, ir_yaml, job_id, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(entryId, ts, language, description, code, irYaml, jobId, tags).run();

  return { id: entryId, timestamp: ts };
}

export async function listKB(db: any, limit: number = 20, offset: number = 0): Promise<{ total: number; items: any[] }> {
  await initKB(db);
  const cappedLimit = Math.min(limit, 100);
  const rows = await db.prepare(
    `SELECT id, timestamp, language, description, job_id, tags,
            length(code) as code_len
     FROM contributions
     ORDER BY timestamp DESC
     LIMIT ? OFFSET ?`
  ).bind(cappedLimit, offset).all();

  const totalRow = await db.prepare('SELECT COUNT(*) as count FROM contributions').first();
  const total = totalRow ? (totalRow as any).count : 0;

  return {
    total,
    items: rows.results || []
  };
}

export async function getKBEntry(db: any, id: string): Promise<any | null> {
  await initKB(db);
  const row = await db.prepare('SELECT * FROM contributions WHERE id = ?').bind(id).first();
  return row || null;
}

export async function deleteKBEntry(db: any, id: string): Promise<boolean> {
  await initKB(db);
  const res = await db.prepare('DELETE FROM contributions WHERE id = ?').bind(id).run();
  return (res.meta?.changes || 0) > 0;
}

export async function searchPatterns(db: any, query: string, limit: number = 5): Promise<any[]> {
  await initKB(db);
  const pattern = `%${query}%`;
  const rows = await db.prepare(
    `SELECT * FROM contributions 
     WHERE language = 'pattern' 
     AND (description LIKE ? OR tags LIKE ? OR code LIKE ?)
     LIMIT ?`
  ).bind(pattern, pattern, pattern, limit).all();

  return rows.results || [];
}
