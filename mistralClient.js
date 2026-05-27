const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-small-latest'; 

/**
 * Stream a completion from Mistral.
 * @param {string} prompt
 * @param {string} apiKey
 * @param {function} onToken - Called with each text chunk as it arrives
 * @param {function} onDone - Called with full text when stream ends
 * @param {AbortSignal} signal - For cancellation
 */
export async function streamCompletion(prompt, apiKey, onToken, onDone, signal = null) {
  const t0 = performance.now();

  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    temperature: 0.4,      
    max_tokens: 600,       
  });

  let response;
  try {
    response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error(`Network error: ${err.message}`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Mistral API error ${response.status}: ${errText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let firstTokenMs = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          if (firstTokenMs === null) {
            firstTokenMs = Math.round(performance.now() - t0);
          }
          fullText += delta;
          onToken(delta, fullText);
        }
      } catch {
        // Malformed SSE line, skip
      }
    }
  }

  const totalMs = Math.round(performance.now() - t0);
  onDone(fullText, { firstTokenMs, totalMs });
  return fullText;
}

export async function complete(prompt, apiKey, maxTokens = 400) {
  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}