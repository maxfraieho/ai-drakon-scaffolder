/**
 * Performs a call to LLM providers with failover support.
 * Providers list:
 * 1. NIM Primary (NIM_API_KEY)
 * 2. NIM Fallback (NIM_API_KEY_2)
 * 3. OpenRouter Fallback (OPENROUTER_API_KEY)
 * 
 * Default model mapping: any input model -> nvidia/llama-3.3-nemotron-super-49b-v1
 * Timeout for each request: 25s
 */
export async function callWithFailover(openaiPayload: any, env: Record<string, string | undefined>): Promise<any> {
  const payload = {
    ...openaiPayload,
    model: 'nvidia/llama-3.3-nemotron-super-49b-v1'
  };

  const providers = [
    { url: "https://integrate.api.nvidia.com/v1", key: env.NIM_API_KEY },
    { url: "https://integrate.api.nvidia.com/v1", key: env.NIM_API_KEY_2 },
    { url: "https://openrouter.ai/api/v1", key: env.OPENROUTER_API_KEY }
  ].filter(p => !!p.key);

  if (providers.length === 0) {
    throw new Error("No configured LLM providers available (missing keys: NIM_API_KEY, NIM_API_KEY_2, OPENROUTER_API_KEY)");
  }

  let lastError: any = null;

  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const url = `${provider.url.replace(/\/$/, '')}/chat/completions`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${provider.key}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      // Read error details
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (_) {}
      
      throw new Error(`Provider ${provider.url} returned status ${response.status}: ${errorBody}`);
    } catch (err: any) {
      lastError = err;
      console.error(`LLM Gateway Failover: Provider call failed. Target URL: ${provider.url}. Error: ${err.message || err}`);
    }
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError?.message || lastError}`);
}
