import { anthropicToOpenAI, openAIResponseToAnthropic } from './formats';
import { callWithFailover } from './failover';

export default async ({ req, res, log, error }: any) => {
  const path = req.path || req.url || '';
  const method = req.method || 'GET';
  const cleanPath = path.split('?')[0].replace(/\/+$/, '');

  log(`Received ${method} request to ${cleanPath}`);

  // Handle health check
  if (method === 'GET' && (cleanPath === '/health' || cleanPath === '' || cleanPath === '/')) {
    return res.json({ status: 'ok', time: new Date().toISOString() });
  }

  // Authentication check
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const expectedToken = process.env.AUTH_TOKEN || 'freecc';
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    error(`Unauthorized access attempt. Expected Bearer ${expectedToken}, got: ${authHeader}`);
    return res.json({ error: 'Unauthorized' }, 401);
  }

  // Environment variables
  const env = {
    NIM_API_KEY: process.env.NIM_API_KEY,
    NIM_API_KEY_2: process.env.NIM_API_KEY_2,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  };

  // Check route
  if (method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e: any) {
        error(`Failed to parse request body: ${e.message}`);
        return res.json({ error: 'Invalid JSON body' }, 400);
      }
    }

    if (cleanPath === '/v1/messages') {
      // Anthropic format
      try {
        log('Converting Anthropic to OpenAI payload...');
        const openaiPayload = anthropicToOpenAI(body);
        
        log('Calling failover providers...');
        const openaiResponse = await callWithFailover(openaiPayload, env);
        
        log('Converting OpenAI response back to Anthropic...');
        const anthropicResponse = openAIResponseToAnthropic(openaiResponse);
        
        return res.json(anthropicResponse);
      } catch (err: any) {
        error(`Error handling Anthropic request: ${err.message || err}`);
        return res.json({ error: err.message || 'Internal Server Error' }, 500);
      }
    }

    if (cleanPath === '/v1/chat/completions') {
      // OpenAI format
      try {
        log('Calling failover providers...');
        const openaiResponse = await callWithFailover(body, env);
        
        return res.json(openaiResponse);
      } catch (err: any) {
        error(`Error handling OpenAI request: ${err.message || err}`);
        return res.json({ error: err.message || 'Internal Server Error' }, 500);
      }
    }
  }

  error(`Route not found: ${method} ${cleanPath}`);
  return res.json({ error: 'Not Found' }, 404);
};
