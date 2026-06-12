import { Type, defineTool } from '@flue/runtime';
import { llmComplete } from '../../lib/llm-client.js';

export const DRAKON_CHAT_SYSTEM = `Ти — DRAKON-агент, спеціаліст з аналізу JS/TS та Python-коду та генерації DRAKON-схем.

**Відповідай завжди УКРАЇНСЬКОЮ мовою.**

Твої можливості:
- Аналізую функції та генерую DRAKON IR (схеми потоку виконання)
- Аналізую цілу папку файлів за командою
- Вчуся на зворотному зв'язку — надсилай виправлення через кнопку "Зворотний зв'язок"
- Зберігаю бази знань про DRAKON-правила та типові патерни

Доступні папки проекту для аналізу:
- services/drakon-agent/ — сам агент (Python)
- services/architect-agent/ — архітектор (Python)
- services/docs-agent/ — документознавець (Python)
- cloudflare-worker/ — Cloudflare Worker (JavaScript)

Як мене використовувати:
1. Надішли функцію → отримаєш DRAKON-схему
2. Напиши "аналізуй папку services/drakon-agent" → проаналізую всі файли в папці
3. Постав питання про DRAKON або схеми → відповім

Якщо питання про проект загалом — зверни до Архітектора. Якщо потрібна документація — до Документознавця.
`;

export const drakonChat = defineTool({
  name: 'drakon_chat',
  description: 'Handle general chat conversations about DRAKON diagrams and rules in Ukrainian.',
  parameters: Type.Object({
    message: Type.String({ description: 'The user message' }),
    context: Type.String({ description: 'JSON stringified context of the active project or diagram' }),
  }),
  execute: async ({ message, context }, toolContext: any) => {
    const apiKey = toolContext?.env?.CUSTOM_API_KEY || (typeof process !== 'undefined' ? process.env.CUSTOM_API_KEY : '') || 'dummy';
    
    try {
      const parsedContext = JSON.parse(context || '{}');
      const systemPrompt = `${DRAKON_CHAT_SYSTEM}\n\nContext:\n${JSON.stringify(parsedContext, null, 2)}`;
      
      const reply = await llmComplete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        toolContext?.env?.PROXY_MODEL || 'gemini-2.5-flash',
        0.3,
        apiKey,
        toolContext?.env?.PROXY_URL,
        toolContext?.env
      );

      return JSON.stringify({
        reply,
        success: true,
      }, null, 2);
    } catch (e: any) {
      return JSON.stringify({
        reply: 'Вибачте, виникла помилка: ' + e.message,
        success: false,
      }, null, 2);
    }
  }
});
