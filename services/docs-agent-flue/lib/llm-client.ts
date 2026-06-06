export async function llmComplete(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gemini-2.5-flash',
  temperature: number = 0.0,
  apiKey?: string
): Promise<string> {
  const url = 'https://agy3.exodus.pp.ua/v1/chat/completions';
  const key = apiKey || (typeof process !== 'undefined' ? process.env.CUSTOM_API_KEY : '') || 'dummy';
  
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
