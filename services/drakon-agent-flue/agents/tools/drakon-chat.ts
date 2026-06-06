import { Type, defineTool } from '@flue/runtime';

export const drakonChat = defineTool({
  name: 'drakon_chat',
  description: 'Handle general chat and feedback conversations about DRAKON diagrams.',
  parameters: Type.Object({
    message: Type.String({ description: 'The user message' }),
    context: Type.String({ description: 'JSON stringified context of the active project or diagram' }),
  }),
  execute: async ({ message, context }) => {
    const proxyUrl = 'https://agy3.exodus.pp.ua/v1/chat/completions';
    const apiKey = typeof process !== 'undefined' ? process.env.CUSTOM_API_KEY || 'dummy' : 'dummy';

    try {
      const parsedContext = JSON.parse(context || '{}');
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are the AI-DRAKON chat assistant. Context:\n${JSON.stringify(parsedContext, null, 2)}`
            },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        throw new Error(`LLM proxy returned status ${response.status}`);
      }

      const responseData: any = await response.json();
      const reply = responseData.choices?.[0]?.message?.content || '';
      return JSON.stringify({
        reply,
        success: true,
      }, null, 2);
    } catch (e) {
      return JSON.stringify({
        reply: 'Sorry, I encountered an error: ' + (e as Error).message,
        success: false,
      }, null, 2);
    }
  }
});
