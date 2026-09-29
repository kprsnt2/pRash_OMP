import { ModelProvider } from '@/types';

export interface ProviderCallParams {
  provider: ModelProvider;
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export interface NormalizedChunk {
  text: string;
  done?: boolean;
}

// Convert payload for providers that don't support images in standard chat
function sanitizeMessagesForTextOnly(
  messages: ProviderCallParams['messages']
): Array<{ role: string; content: string }> {
  return messages.map((m) => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    const textParts = m.content
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('\n');
    const imageCount = m.content.filter((part) => part.type === 'image_url').length;
    const notice = imageCount > 0 ? `\n[${imageCount} image attachment(s) referenced in conversation]` : '';
    return {
      role: m.role,
      content: (textParts + notice).trim() || '[Empty message]',
    };
  });
}

function splitDataUrl(dataUrl: string): { mime: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

/** Formats messages for Google Gemini's native API */
function toGeminiPayload(messages: ProviderCallParams['messages']) {
  let systemInstruction = '';
  const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];

  for (const m of messages) {
    if (m.role === 'system') {
      if (typeof m.content === 'string') {
        systemInstruction += (systemInstruction ? '\n\n' : '') + m.content;
      }
      continue;
    }

    const parts: Array<Record<string, unknown>> = [];
    if (typeof m.content === 'string') {
      if (m.content) parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const item of m.content) {
        if (item.type === 'text' && item.text) {
          parts.push({ text: item.text });
        } else if (item.type === 'image_url' && item.image_url?.url) {
          const split = splitDataUrl(item.image_url.url);
          if (split) {
            parts.push({
              inlineData: {
                mimeType: split.mime,
                data: split.data,
              },
            });
          }
        }
      }
    }

    if (parts.length === 0) {
      parts.push({ text: ' ' });
    }

    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  return {
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };
}

export async function callProviderApi(params: ProviderCallParams): Promise<Response> {
  const { provider, model, messages, apiKey } = params;

  if (provider === 'gemini') {
    // 1. Primary: Google Gemini Native REST API (Works with standard Google AI Studio keys)
    const normalizedModel = model.startsWith('gemini') ? model : 'gemini-flash-latest';
    const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      normalizedModel
    )}:streamGenerateContent?alt=sse`;

    const geminiBody = toGeminiPayload(messages);

    const nativeRes = await fetch(nativeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(geminiBody),
    });

    if (nativeRes.ok) {
      return nativeRes;
    }

    // 2. Secondary fallback: Gemini OpenAI-compatible endpoint
    return fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: normalizedModel,
        messages,
        stream: true,
      }),
    });
  }

  if (provider === 'openai') {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });
  }

  if (provider === 'nvidia') {
    const textMessages = sanitizeMessagesForTextOnly(messages);
    return fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: textMessages,
        stream: true,
        temperature: 0.6,
        max_tokens: 4096,
      }),
    });
  }

  if (provider === 'groq') {
    const textMessages = sanitizeMessagesForTextOnly(messages);
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: textMessages,
        stream: true,
        temperature: 0.6,
        max_tokens: 4096,
      }),
    });
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/** Parses raw provider stream and yields pure text tokens safely */
export async function* parseProviderStream(
  provider: ModelProvider,
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) continue;

        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const json = JSON.parse(dataStr);

            // Google Gemini native SSE candidates format
            if (provider === 'gemini' && Array.isArray(json?.candidates)) {
              const parts = json.candidates[0]?.content?.parts;
              if (Array.isArray(parts)) {
                for (const part of parts) {
                  if (typeof part?.text === 'string' && part.text) {
                    yield part.text;
                  }
                }
              }
              continue;
            }

            // OpenAI / Groq / NVIDIA / OpenAI-compat format
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta) {
              yield delta;
              continue;
            }

            // Some reasoning models emit text in message or reasoning_content
            const altText = json?.choices?.[0]?.text;
            if (typeof altText === 'string' && altText) {
              yield altText;
              continue;
            }
          } catch {
            // Malformed chunk or keepalive; skip safely without dumping raw JSON
          }
        }
      }
    }

    // Flush leftover buffer if it forms a complete data line
    if (buffer.trim().startsWith('data:')) {
      const dataStr = buffer.trim().slice(5).trim();
      if (dataStr && dataStr !== '[DONE]') {
        try {
          const json = JSON.parse(dataStr);
          const delta = json?.choices?.[0]?.delta?.content || json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof delta === 'string' && delta) yield delta;
        } catch {
          // ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/** Built-in smart fallback response generator when all external API keys fail or are unconfigured */
export async function* generateSmartFallbackResponse(
  agentName: string,
  userPrompt: string
): AsyncGenerator<string> {
  const intro = `Hello! I am **${agentName}**. `;
  yield intro;
  await sleep(60);

  const lower = userPrompt.toLowerCase().trim();
  let reply = '';

  if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
    reply = `It's great to connect with you! I'm here to assist you with specialized tasks, worksheets, code, data analysis, medical summaries, and more. 

*(Note: Auto-fallback is active. To use frontier live models like gpt-5.4-mini or gemini-flash-latest, add your API key in Settings ⚙️ or set them in \`.env.local\`)*

How can I help you today?`;
  } else if (lower.includes('worksheet') || lower.includes('math') || lower.includes('fraction')) {
    reply = `Here is a practice worksheet prepared for you:

# Grade 4 Practice Worksheet: Fractions & Word Problems

Name: _______________________  
Date: _______________________  
Score: ______________________

---

### Section A: Fraction Addition
1. $\\frac{1}{4} + \\frac{2}{4} =$ ______
2. $\\frac{3}{8} + \\frac{2}{8} =$ ______
3. $\\frac{5}{12} + \\frac{4}{12} =$ ______

### Section B: Word Problems
4. Leo ate $\\frac{2}{6}$ of a pizza and Maya ate $\\frac{3}{6}$ of the same pizza. What fraction of the pizza did they eat altogether?

--- [ANSWER KEY] ---

### 🔑 Teacher & Parent Answer Key
1. $\\frac{3}{4}$
2. $\\frac{5}{8}$
3. $\\frac{9}{12} = \\frac{3}{4}$
4. $\\frac{2}{6} + \\frac{3}{6} = \\frac{5}{6}$ of the pizza.`;
  } else {
    reply = `I've received your query:
> "${userPrompt.slice(0, 150)}${userPrompt.length > 150 ? '...' : ''}"

I am ready to assist you. To connect to live cloud inference with **Google Gemini**, **OpenAI GPT-5.4 Mini**, **Groq**, or **NVIDIA NIM**, please add your API key in **Settings (Gear Icon)** or configure your environment variables. 

Feel free to ask questions, explore worksheets, or upload documents!`;
  }

  // Stream words smoothly
  const words = reply.split(' ');
  for (let i = 0; i < words.length; i++) {
    yield (i === 0 ? '' : ' ') + words[i];
    await sleep(20);
  }
}
