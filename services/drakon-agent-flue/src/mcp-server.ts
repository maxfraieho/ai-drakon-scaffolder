import { Context } from 'hono';
import { analyzeCode } from '../agents/tools/analyze-code.js';
import { drakonChat } from '../agents/tools/drakon-chat.js';
import { analyzeFolder } from '../agents/tools/analyze-folder.js';
import { feedbackTool } from '../agents/tools/feedback.js';

const MCP_TOOLS = [
  {
    name: 'analyze_code',
    description: 'Analyze source code (Python, JS, TS) and generate validated and refined DRAKON IR.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code content' },
        filename: { type: 'string', description: 'Filename of the module' },
        refine: { type: 'boolean', description: 'Enable LLM refinement' },
      },
      required: ['code', 'filename'],
    },
  },
  {
    name: 'drakon_chat',
    description: 'Handle general chat conversations about DRAKON diagrams and rules in Ukrainian.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The user message' },
        context: { type: 'string', description: 'JSON stringified context of the active project or diagram' },
      },
      required: ['message'],
    },
  },
  {
    name: 'analyze_folder',
    description: 'Analyze all code files (Python, JS, TS) in a directory and generate DRAKON diagrams.',
    inputSchema: {
      type: 'object',
      properties: {
        folderPath: { type: 'string', description: 'Target folder path' },
        maxFiles: { type: 'number', description: 'Maximum number of files to analyze' },
        refine: { type: 'boolean', description: 'Enable LLM refinement' },
      },
      required: ['folderPath'],
    },
  },
  {
    name: 'feedback',
    description: 'Persist diagram feedback and corrections into the knowledge base.',
    inputSchema: {
      type: 'object',
      properties: {
        diagramName: { type: 'string', description: 'The name of the diagram' },
        feedback: { type: 'string', description: 'Description of the error' },
        correctedIr: { type: 'object', description: 'Optional corrected DRAKON IR' },
      },
      required: ['diagramName', 'feedback'],
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
            name: 'drakon-agent-mcp',
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

        if (name === 'analyze_code') {
          const { code, filename, refine } = args || {};
          resultString = await analyzeCode.execute({
            code: code || '',
            filename: filename || 'module.js',
            refine: refine !== false,
          }, toolContext);
        } else if (name === 'drakon_chat') {
          const { message, context: chatCtx } = args || {};
          resultString = await drakonChat.execute({
            message: message || '',
            context: chatCtx || '{}',
          }, toolContext);
        } else if (name === 'analyze_folder') {
          const { folderPath, maxFiles, refine } = args || {};
          resultString = await analyzeFolder.execute({
            folderPath: folderPath || '',
            maxFiles: maxFiles || 20,
            refine: refine !== false,
          }, toolContext);
        } else if (name === 'feedback') {
          const { diagramName, feedback: fbText, correctedIr } = args || {};
          resultString = await feedbackTool.execute({
            diagramName: diagramName || '',
            feedback: fbText || '',
            correctedIr: correctedIr,
          }, toolContext);
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
