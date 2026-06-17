import { Context } from 'hono';
import { docsChat } from '../tools/docs-chat.js';
import { notesCrud } from '../tools/notes-crud.js';
import { docsFs } from '../tools/docs-fs.js';
import { projectsTool } from '../tools/projects.js';
import { drakonIr } from '../tools/drakon-ir.js';
import { gitnexusDocs } from '../tools/gitnexus-docs.js';
import { dataviewTool } from '../tools/dataview.js';
import { kbSearch, kbIndex } from '../tools/kb-search.js';

const MCP_TOOLS = [
  {
    name: 'docs_chat',
    description: 'Chat with the documentation agent and receive project doc suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The user message' },
        currentDoc: { type: 'string', description: 'Raw content of the current document' },
        fileTree: { type: 'string', description: 'JSON stringified file tree of the project' },
        memoryContext: { type: 'string', description: 'Memory context' },
        kbContext: { type: 'string', description: 'DRAKON rules context' },
      },
      required: ['message'],
    },
  },
  {
    name: 'notes_crud',
    description: 'Manage markdown notes (CRUD + graph + Zettelkasten restructuring) using the GitHub API.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list', 'read', 'write', 'delete', 'restructure', 'graph'], description: 'Operation to perform' },
        slug: { type: 'string', description: 'Slug of the note' },
        title: { type: 'string', description: 'Title of the note (for write)' },
        content: { type: 'string', description: 'Content of the note (for write)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags (for write)' },
        project: { type: 'string', description: 'Project slug (for list/graph)' },
        flat: { type: 'boolean', description: 'Flat list instead of folder tree' },
      },
      required: ['operation'],
    },
  },
  {
    name: 'docs_fs',
    description: 'Read files or list directories from the project GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list', 'read'], description: 'Operation to perform' },
        path: { type: 'string', description: 'Path relative to project root' },
        maxChars: { type: 'number', description: 'Max characters to read' },
      },
      required: ['operation', 'path'],
    },
  },
  {
    name: 'projects',
    description: 'Manage projects registry using KV storage.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list', 'add', 'delete'], description: 'Operation to perform' },
        slug: { type: 'string', description: 'Slug of the project' },
        name: { type: 'string', description: 'Name of the project' },
        path: { type: 'string', description: 'Local path on dev server' },
        description: { type: 'string', description: 'Description' },
        hasDrakonIr: { type: 'boolean' },
        hasDocs: { type: 'boolean' },
        github: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            branch: { type: 'string' },
          },
          required: ['owner', 'repo', 'branch'],
        },
      },
      required: ['operation'],
    },
  },
  {
    name: 'drakon_ir',
    description: 'Manage DRAKON IR diagrams stored in the GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['list', 'get'], description: 'Operation to perform' },
        name: { type: 'string', description: 'Diagram name without .json suffix' },
      },
      required: ['operation'],
    },
  },
  {
    name: 'gitnexus_docs',
    description: 'GitNexus documentation pipeline helper.',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['generate_docs', 'api_docs', 'what_changed', 'repos'], description: 'Operation to perform' },
        repo: { type: 'string' },
        concept: { type: 'string' },
        route: { type: 'string' },
        symbol: { type: 'string' },
      },
      required: ['operation'],
    },
  },
  {
    name: 'dataview',
    description: 'Execute Obsidian Dataview Query Language (DQL) query against YAML frontmatter.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The DQL query string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'kb_search',
    description: 'Semantic search in project knowledge base using vector + graph expansion',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        project: { type: 'string', description: 'Project name/slug' },
        top_k: { type: 'number', description: 'Number of results to return (default 5)' },
      },
      required: ['query', 'project'],
    },
  },
  {
    name: 'kb_index',
    description: 'Trigger KB re-indexing for a project (incremental, skips unchanged articles)',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name/slug' },
      },
      required: ['project'],
    },
  },
];

export async function handleMcp(c: Context) {
  const reqBody: any = await c.req.json().catch(() => null);
  if (!reqBody || typeof reqBody !== 'object') {
    return c.json({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error' },
      id: null,
    }, 400);
  }

  const { jsonrpc, method, params, id } = reqBody;
  if (jsonrpc !== '2.0') {
    return c.json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request' },
      id: id || null,
    }, 400);
  }

  const toolContext = { env: c.env };

  switch (method) {
    case 'initialize':
      return c.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'docs-agent-mcp',
            version: '1.0.0',
          },
        },
        id,
      });

    case 'tools/list':
      return c.json({
        jsonrpc: '2.0',
        result: {
          tools: MCP_TOOLS,
        },
        id,
      });

    case 'tools/call': {
      const { name, arguments: args } = params || {};
      if (!name) {
        return c.json({
          jsonrpc: '2.0',
          error: { code: -32602, message: 'Invalid params: name is required' },
          id,
        }, 400);
      }

      try {
        let resultString = '';

        if (name === 'docs_chat') {
          resultString = await docsChat.execute(args, toolContext as any);
        } else if (name === 'notes_crud') {
          resultString = await notesCrud.execute(args, toolContext as any);
        } else if (name === 'docs_fs') {
          resultString = await docsFs.execute(args, toolContext as any);
        } else if (name === 'projects') {
          resultString = await projectsTool.execute(args, toolContext as any);
        } else if (name === 'drakon_ir') {
          resultString = await drakonIr.execute(args, toolContext as any);
        } else if (name === 'gitnexus_docs') {
          resultString = await gitnexusDocs.execute(args, toolContext as any);
        } else if (name === 'dataview') {
          resultString = await dataviewTool.execute(args, toolContext as any);
        } else if (name === 'kb_search') {
          const topK = args.top_k ?? args.topK ?? 5;
          const results = await kbSearch(args.query, args.project, topK, toolContext as any);
          resultString = JSON.stringify(results, null, 2);
        } else if (name === 'kb_index') {
          const result = await kbIndex(args.project, toolContext as any);
          resultString = JSON.stringify(result, null, 2);
        } else {
          return c.json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${name}` },
            id,
          }, 404);
        }

        return c.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: resultString,
              },
            ],
          },
          id,
        });
      } catch (e: any) {
        return c.json({
          jsonrpc: '2.0',
          error: { code: -32603, message: `Internal error: ${e.message}` },
          id,
        }, 500);
      }
    }

    default:
      return c.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id,
      }, 404);
  }
}
