import { createAPIFileRoute } from '@tanstack/react-router';

export const Route = createAPIFileRoute('/api/magic/generate')({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { prompt, lang } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Mock implementation for the Magic Demo
      // In production, this would call docs-agent -> architect-agent -> drakontechgen
      
      const mockResult = {
        ir: {
          id: `magic-diagram-${Date.now()}`,
          nodes: [
            { id: "start", type: "branch", text: "Start" },
            { id: "action1", type: "action", text: `Process: ${prompt.substring(0, 50)}...` },
            { id: "end", type: "end", text: "End" }
          ],
          edges: [
            { source: "start", target: "action1" },
            { source: "action1", target: "end" }
          ]
        },
        code: `// Generated based on: ${prompt}\nfunction executeMagic() {\n  console.log("Processing...");\n  return true;\n}`,
        shareUrl: `https://drakon.io/s/${Math.random().toString(36).substring(2, 8)}`
      };

      // Simulate delay for the "magic" effect (3 seconds instead of 30 for testing)
      await new Promise(resolve => setTimeout(resolve, 3000));

      return new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error generating magic diagram:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
});
