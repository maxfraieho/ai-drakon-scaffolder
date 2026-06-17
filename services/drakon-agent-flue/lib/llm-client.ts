export async function llmComplete(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gemini-2.5-flash',
  temperature: number = 0.0,
  apiKey?: string,
  proxyUrl?: string,
  env?: any
): Promise<string> {
  const resolvedEnv = env || (typeof process !== 'undefined' ? process.env : undefined);

  let baseUrl = proxyUrl || resolvedEnv?.PROXY_URL || 'https://6a3200cd0006b155c099.fra.appwrite.run/v1/chat/completions';
  let url = baseUrl;
  if (url && !url.endsWith('/chat/completions')) {
    url = url.endsWith('/') ? url + 'chat/completions' : url + '/chat/completions';
  }

  const key = apiKey || resolvedEnv?.PROXY_TOKEN || resolvedEnv?.CUSTOM_API_KEY || 'freecc';
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 4096
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM Proxy error: status ${res.status}. Details: ${errText}`);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
