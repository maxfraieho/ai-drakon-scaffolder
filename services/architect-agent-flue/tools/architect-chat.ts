import { llmComplete } from '../lib/llm-client.js';
import { ARCHITECT_SYSTEM_PROMPT } from '../lib/prompts.js';

export async function architectChat(
  message: string,
  fileTree?: any,
  currentDiagram?: any,
  memoryContext: string = '',
  kbContext: string = '',
  projectSlug?: string,
  projectPath?: string,
  env?: any
): Promise<any> {
  const parts: string[] = [];
  if (memoryContext) {
    parts.push(`## My Memory\n${memoryContext}`);
  }

  const drakonRules = kbContext || `
- b0: {type:"branch",branchId:0,one:"<перший_вузол>"} — ОБОВ'ЯЗКОВО
- end: {type:"end"} — ОБОВ'ЯЗКОВО
- action: {type:"action",content:"<текст>",one:"<далі>"}
- question: {type:"question",content:"<умова>?",one:"<так>",two:"<ні>"}
  one=ТАК (вниз), two=НІ (вправо)
- params — завжди рядок, ніколи масив
  `;
  parts.push(`## DRAKON Rules (reference)\n${drakonRules.substring(0, 1500)}`);

  if (fileTree) {
    parts.push(`## Project File Tree\n${JSON.stringify(fileTree, null, 2).substring(0, 3000)}`);
  }
  if (currentDiagram) {
    parts.push(`## Current Diagram\n${JSON.stringify(currentDiagram, null, 2).substring(0, 2000)}`);
  }
  parts.push(`## User Message\n${message}`);

  let systemPrompt = ARCHITECT_SYSTEM_PROMPT;
  if (projectSlug) {
    const loc = projectPath ? ` at ${projectPath}` : '';
    systemPrompt += `\n\n**Active project: ${projectSlug}${loc}. Focus your responses on this project, not on the default AI-DRAKON IDE context.**`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: parts.join('\n\n') }
  ];

  const content = await llmComplete(
    messages,
    env?.PROXY_MODEL || 'gemini-2.5-flash',
    0.2,
    env?.CUSTOM_API_KEY || env?.PROXY_TOKEN,
    env?.PROXY_URL,
    env
  );

  let mutations = null;
  const match = content.match(/```json\s*(\[[\s\S]*?\])\s*```/);
  if (match) {
    try {
      mutations = JSON.parse(match[1]);
    } catch (e) {}
  }

  return {
    reply: content,
    suggested_mutations: mutations
  };
}

export async function architectChatWithSystem(
  message: string,
  systemPrompt: string,
  fileTree?: any,
  currentDiagram?: any,
  env?: any
): Promise<any> {
  const parts: string[] = [];
  if (fileTree) {
    parts.push(`## Project File Tree\n${JSON.stringify(fileTree, null, 2).substring(0, 2000)}`);
  }
  if (currentDiagram) {
    parts.push(`## Current Diagram\n${JSON.stringify(currentDiagram, null, 2).substring(0, 1500)}`);
  }
  parts.push(`## User Message\n${message}`);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: parts.join('\n\n') }
  ];

  const content = await llmComplete(
    messages,
    env?.PROXY_MODEL || 'gemini-2.5-flash',
    0.1,
    env?.CUSTOM_API_KEY || env?.PROXY_TOKEN,
    env?.PROXY_URL,
    env
  );

  return {
    reply: content,
    suggested_mutations: null
  };
}
