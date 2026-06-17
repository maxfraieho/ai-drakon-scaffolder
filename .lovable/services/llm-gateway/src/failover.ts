/**
 * Performs a call to LLM providers with failover support.
 * Providers:
 * 1. NIM Primary (NIM_API_KEY)
 * 2. NIM Fallback (NIM_API_KEY_2)
 * 3. OpenRouter Fallback (OPENROUTER_API_KEY)
 * 4. Google Gemini Fallback (GOOGLE_API_KEY)
 *
 * Timeout per provider: 25s. On 429 or error — tries next.
 */

interface Provider {
  url: string;
  key: string;
  model: string;
}

export async function callWithFailover(openaiPayload: any, env: Record<string, string | undefined>): Promise<any> {
  const providers: Provider[] = [
    {
      url: "https://integrate.api.nvidia.com/v1",
      key: env.NIM_API_KEY || "",
      model: "nvidia/llama-3.3-nemotron-super-49b-v1"
    },
    {
      url: "https://integrate.api.nvidia.com/v1",
      key: env.NIM_API_KEY_2 || "",
      model: "nvidia/llama-3.3-nemotron-super-49b-v1"
    },
    {
      url: "https://openrouter.ai/api/v1",
      key: env.OPENROUTER_API_KEY || "",
      model: "nvidia/nemotron-3-super-120b-a12b:free"
    },
    {
      url: "https://generativelanguage.googleapis.com/v1beta/openai",
      key: env.GOOGLE_API_KEY || "",
      model: "gemini-2.5-flash"
    }
  ].filter(p => !!p.key);

  if (providers.length === 0) {
    throw new Error("No configured LLM providers (missing: NIM_API_KEY, OPENROUTER_API_KEY, GOOGLE_API_KEY)");
  }

  let lastError: any = null;

  for (const provider of providers) {
    try {
      const payload = { ...openaiPayload, model: provider.model };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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

      let errorBody = '';
      try { errorBody = await response.text(); } catch (_) {}

      // 429 = rate limit → try next provider immediately
      if (response.status === 429) {
        lastError = new Error(`Provider ${provider.url} rate-limited (429)`);
        console.error(`LLM Gateway: ${lastError.message}`);
        continue;
      }

      throw new Error(`Provider ${provider.url} returned ${response.status}: ${errorBody.slice(0, 200)}`);
    } catch (err: any) {
      lastError = err;
      console.error(`LLM Gateway failover: ${provider.url} failed — ${err.message || err}`);
    }
  }

  throw new Error(`All LLM providers failed. Last: ${lastError?.message || lastError}`);
}
