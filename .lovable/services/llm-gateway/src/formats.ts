/**
 * Converts Anthropic request payload to OpenAI chat completions format.
 */
export function anthropicToOpenAI(body: any): any {
  if (!body) return {};

  const messages: any[] = [];
  
  // 1. Convert Anthropic system prompt
  if (body.system) {
    if (typeof body.system === 'string') {
      messages.push({ role: 'system', content: body.system });
    } else if (Array.isArray(body.system)) {
      const systemContent = body.system
        .map((block: any) => typeof block === 'string' ? block : (block.text || ''))
        .filter(Boolean)
        .join('\n');
      if (systemContent) {
        messages.push({ role: 'system', content: systemContent });
      }
    }
  }

  // 2. Convert Anthropic messages
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      let content = msg.content;
      if (Array.isArray(content)) {
        content = content
          .map((block: any) => typeof block === 'string' ? block : (block.text || ''))
          .filter(Boolean)
          .join('\n');
      }
      messages.push({
        role: msg.role || 'user',
        content: content || ''
      });
    }
  }

  const openaiPayload: any = {
    model: body.model || 'nvidia/llama-3.3-nemotron-super-49b-v1',
    messages,
  };

  // 3. Map parameters
  if (body.max_tokens !== undefined) {
    openaiPayload.max_tokens = body.max_tokens;
  }
  if (body.temperature !== undefined) {
    openaiPayload.temperature = body.temperature;
  }
  if (body.top_p !== undefined) {
    openaiPayload.top_p = body.top_p;
  }
  if (body.stream !== undefined) {
    openaiPayload.stream = body.stream;
  }

  return openaiPayload;
}

/**
 * Converts OpenAI chat completions response to Anthropic message response format.
 */
export function openAIResponseToAnthropic(data: any): any {
  if (!data) return {};

  const textContent = data.choices?.[0]?.message?.content || '';
  const finishReason = data.choices?.[0]?.finish_reason;
  
  let stopReason = 'end_turn';
  if (finishReason === 'length') {
    stopReason = 'max_tokens';
  } else if (finishReason === 'stop') {
    stopReason = 'end_turn';
  } else if (finishReason) {
    stopReason = finishReason;
  }

  return {
    id: data.id || `msg_${Math.random().toString(36).substring(2, 15)}`,
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: textContent
      }
    ],
    model: data.model || 'nvidia/llama-3.3-nemotron-super-49b-v1',
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0
    }
  };
}
